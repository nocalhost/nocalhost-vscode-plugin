import * as vscode from "vscode";
import { spawn } from "child_process";
import * as assert from "assert";

import { NhctlCommand, getRunningPodNames } from "./../ctl/nhctl";
import host from "../host";
import { ContainerConfig } from "../service/configService";
import { IDebugProvider } from "./provider/iDebugProvider";
import logger from "../utils/logger";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import { checkRequiredCommand, killContainerCommandProcess } from ".";

export class DebugSession {
  public async launch(
    workspaceFolder: vscode.WorkspaceFolder,
    debugProvider: IDebugProvider,
    node: ControllerResourceNode,
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

    assert.strictEqual(podNames.length, 1, "not found pod");

    await checkRequiredCommand(
      podNames[0],
      node.getNameSpace(),
      node.getKubeConfigPath()
    );
    await killContainerCommandProcess(container, node, podNames[0]);
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
      workDir
    );

    if (!success) {
      terminatedCallback();
    }
  }

  async enterContainer(
    kubeconfigPath: string,
    container: ContainerConfig,
    namespace: string,
    node: ControllerResourceNode
  ) {
    const debugCommand = (container.dev.command?.debug ?? []).join(" ");

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

    const name = "run:" + `${node.getAppName()}-${node.name}`;

    let terminal = vscode.window.terminals.find((t) => t.name === name);
    if (terminal) {
      terminal.sendText("clear");
      terminal.sendText(cmd);
      terminal.show();
      return;
    } else {
      terminal = host.invokeInNewTerminal(cmd, name);

      const disposable = [
        vscode.window.onDidCloseTerminal((e) => {
          if (e.name === name) {
            disposable.forEach((d) => d.dispose());
          }
        }),
      ];
    }
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
