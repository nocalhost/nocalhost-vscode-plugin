import * as vscode from "vscode";
import { spawn } from "child_process";

import { NhctlCommand, getRunningPodNames } from "./../ctl/nhctl";
import host from "../host";
import { Deployment } from "../nodes/workloads/controllerResources/deployment/Deployment";
import { ContainerConfig } from "../service/configService";
import { IDebugProvider } from "./IDebugprovider";
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

    // await debugProvider.checkRequiredCommand(
    //   podNames[0],
    //   node.getNameSpace(),
    //   node.getKubeConfigPath()
    // );

    const debugCommand =
      (container.dev.command && container.dev.command.debug) || [];

    host.log("[debug] launch debug", true);
    let terminal = this.enterContainer(
      node.getKubeConfigPath(),
      debugCommand,
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
        terminal.sendText("\x03");
        terminal.hide();
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

  enterContainer(
    kubeconfigPath: string,
    execCommand: string[],
    namespace: string,
    node: Deployment
  ) {
    const args = [
      "exec",
      node.getAppName(),
      "-d",
      node.label,
      "--command",
      "bash",
      "--command",
      "-c",
      "--command",
      `${execCommand.join(" ")}`,
      "--kubeconfig",
      kubeconfigPath,
      "-n",
      namespace,
    ];

    const cmd = `${NhctlCommand.nhctlPath} ${args.join(" ")}`;
    logger.info(`[debug] ${cmd}`);
    host.log(`${cmd}`, true);

    const name = `debug--${node.getAppName()}-${node.label}`;

    const terminal = host.invokeInNewTerminal(cmd, name);
    terminal.show();

    vscode.window.onDidCloseTerminal((e) => {
      if (e.name === name) {
        terminal.sendText("\x03");
      }
    });

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
