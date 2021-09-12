import * as vscode from "vscode";
import { spawn, spawnSync } from "child_process";

import { NhctlCommand, getRunningPodNames } from "./../ctl/nhctl";
import host from "../host";
import { Deployment } from "../nodes/workloads/controllerResources/deployment/Deployment";
import { ContainerConfig } from "../service/configService";
import { IDebugProvider } from "./provider/iDebugProvider";
import logger from "../utils/logger";

export class DebugSession {
  public async launch(
    workspaceFolder: vscode.WorkspaceFolder,
    debugProvider: IDebugProvider,
    node: Deployment,
    container: ContainerConfig
  ) {
    if (!workspaceFolder) {
      return;
    }

    const isInstalled = await debugProvider.isDebuggerInstalled();
    if (!isInstalled) {
      host.showInformationMessage("please install dependent extension.");
      return;
    }

    const port =
      (container.dev.debug && container.dev.debug.remoteDebugPort) || 9229;

    const podNames = await getRunningPodNames({
      name: node.name,
      kind: node.resourceType,
      namespace: node.getNameSpace(),
      kubeConfigPath: node.getKubeConfigPath(),
    });
    if (podNames.length < 1) {
      logger.info(`debug: not found pod`);
      return;
    }

    await debugProvider.checkRequiredCommand(
      podNames[0],
      node.getNameSpace(),
      node.getKubeConfigPath()
    );

    host.log("[debug] launch debug", true);
    let terminal = await this.enterContainer(
      node.getKubeConfigPath(),
      container,
      node.getNameSpace(),
      node
    );

    const cwd = workspaceFolder.uri.fsPath;

    host.log("[debug] port forward", true);

    const proc = await this.portForward({
      port: `${port}:${port}`,
      appName: node.getAppName(),
      podName: podNames[0],
      kubeconfigPath: node.getKubeConfigPath(),
      namespace: node.getNameSpace(),
      workloadName: node.name,
      resourceType: node.resourceType,
    });
    if (!proc) {
      return;
    }

    const workDir = container.dev.workDir || "/home/nocalhost-dev";

    host.log("[debug] start debug", true);

    const terminatedCallback = async () => {
      if (terminal) {
        terminal.dispose();

        terminal = null;
      }
    };

    const success = await debugProvider.startDebug(
      cwd,
      `${Date.now()}`,
      port,
      workDir,
      terminatedCallback
    );

    if (!success) {
      terminatedCallback();
    }
  }

  async enterContainer(
    kubeconfigPath: string,
    container: ContainerConfig,
    namespace: string,
    node: Deployment
  ) {
    const runCommand = (container.dev.command?.run ?? []).join(" ");
    const debugCommand = (container.dev.command?.debug ?? []).join(" ");

    const grepPattern: Array<string> = [];
    if (runCommand) {
      grepPattern.push(`-e '${runCommand}'`);
    }
    if (debugCommand) {
      grepPattern.push(`-e '${debugCommand}'`);
    }

    const grepStr = "grep " + grepPattern.join(" ");

    const killCommand = `ps aux|${grepStr}|grep -v grep|awk '{print $2}'|xargs kill -9`;

    spawnSync(NhctlCommand.nhctlPath, [
      "exec",
      node.getAppName(),
      "-d",
      node.label,
      "--command",
      "sh",
      "--command",
      "-c",
      "--command",
      killCommand,
      "--kubeconfig",
      node.getKubeConfigPath(),
      "-n",
      node.getNameSpace(),
      ,
    ]);

    const args = [
      "exec",
      node.getAppName(),
      "-d",
      node.label,
      "--command",
      "sh",
      "--command",
      "-c",
      "--command",
      debugCommand,
      "--kubeconfig",
      kubeconfigPath,
      "-n",
      namespace,
    ];

    const cmd = `${NhctlCommand.nhctlPath} ${args.join(" ")}`;

    logger.info(`[debug] ${cmd}`);
    host.log(`${cmd}`, true);

    const name = `debug:${node.getAppName()}-${node.label}`;

    const terminal = host.invokeInNewTerminal(cmd, name);
    terminal.show();

    return terminal;
  }

  async portForward(props: {
    port: string;
    appName: string;
    workloadName: string;
    resourceType: string;
    podName: string;
    kubeconfigPath: string;
    namespace: string;
  }) {
    const {
      port,
      workloadName,
      appName,
      podName,
      kubeconfigPath,
      namespace,
    } = props;
    const command = `port-forward start ${appName} -d ${workloadName} --pod ${podName} -p ${port} --kubeconfig ${kubeconfigPath} -n ${namespace}`;
    const cmd = `${NhctlCommand.nhctlPath} ${command}`;
    host.log(`[debug] port-forward: ${cmd}`, true);
    logger.info(`[debug] port-forward: ${cmd}`);
    const proc = spawn(NhctlCommand.nhctlPath, command.split(" "));

    return proc;
  }
}
