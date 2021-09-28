import * as vscode from "vscode";
import * as assert from "assert";

import { NhctlCommand, getRunningPodNames } from "./../ctl/nhctl";
import { ContainerConfig } from "../service/configService";
import { checkDebuggerInstalled } from "./provider";
import { LiveReload } from "../debug/liveReload";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import { closeTerminals, getContainer } from "./index";
import { exec } from "../ctl/shell";
import { IDebugProvider } from "./provider/IDebugProvider";
import { createRemoteTerminal } from "./remoteTerminal";

export class DebugSession {
  disposable: Array<{ dispose(): any }> = [];
  container: ContainerConfig;
  node: ControllerResourceNode;
  podName: string;
  isReload: boolean;

  public async launch(
    workspaceFolder: vscode.WorkspaceFolder,
    debugProvider: IDebugProvider,
    node: ControllerResourceNode,
    container?: ContainerConfig
  ) {
    if (!workspaceFolder) {
      return;
    }

    const isInstalled = checkDebuggerInstalled(debugProvider);
    if (!isInstalled) {
      return;
    }

    if (!container) {
      container = await getContainer(node);
    }
    this.container = container;
    this.node = node;

    const podNames = await getRunningPodNames({
      name: node.name,
      kind: node.resourceType,
      namespace: node.getNameSpace(),
      kubeConfigPath: node.getKubeConfigPath(),
    });

    assert.strictEqual(podNames.length, 1, "not found pod");

    this.podName = podNames[0];

    await this.startDebug(debugProvider, workspaceFolder);
  }

  async portForward(command: "end" | "start") {
    const { container, node } = this;
    const port =
      (container.dev.debug && container.dev.debug.remoteDebugPort) || 9229;

    await exec({
      command: NhctlCommand.nhctlPath,
      args: [
        "port-forward",
        command,
        node.getAppName(),
        `-d ${node.name}`,
        `-t ${node.resourceType}`,
        `-p ${port}:${port}`,
        `-n ${node.getNameSpace()}`,
        `--kubeconfig ${node.getKubeConfigPath()}`,
      ],
    }).promise;

    if (command === "start") {
      this.disposable.push({
        dispose: async () => {
          await this.portForward("end");
        },
      });
    }
  }

  async startDebug(
    debugProvider: IDebugProvider,
    workspaceFolder: vscode.WorkspaceFolder
  ) {
    const { container, node } = this;

    await this.portForward("start");

    const terminal = await this.createTerminal(debugProvider);

    const debugSessionName = `${node.getAppName()}-${node.name}`;

    const success = await debugProvider.startDebugging(
      workspaceFolder.uri.fsPath,
      debugSessionName,
      container,
      node,
      this.podName
    );

    if (!success) {
      this.dispose();
    } else {
      this.disposable.push(
        vscode.debug.onDidTerminateDebugSession(async (debugSession) => {
          if (debugSession.name === debugSessionName) {
            await debugProvider.waitStopDebug();

            terminal.sendText("\x03");

            if (this.isReload) {
              await debugProvider.startDebugging(
                workspaceFolder.uri.fsPath,
                debugSessionName,
                container,
                node,
                this.podName
              );

              this.isReload = false;
            } else {
              this.dispose();
            }
          }
        })
      );
    }
  }
  liveReload() {
    const { container, node } = this;

    if (container.dev.hotReload === true) {
      const liveReload = new LiveReload(
        {
          namespace: node.getNameSpace(),
          kubeConfigPath: node.getKubeConfigPath(),
          resourceType: node.resourceType,
          app: node.getAppName(),
          service: node.name,
        },
        async () => {
          this.isReload = true;
          await vscode.debug.stopDebugging(vscode.debug.activeDebugSession);
        }
      );

      this.disposable.push(liveReload);
    }
  }
  async createTerminal(debugProvider: IDebugProvider) {
    await closeTerminals();

    const { container, node, podName } = this;
    const debugCommand = (container.dev.command?.debug ?? []).join(" ");

    const command = await NhctlCommand.exec({
      namespace: node.getNameSpace(),
      kubeConfigPath: node.getKubeConfigPath(),
      args: [podName, "-i", `-c nocalhost-dev`, `-- bash -c "${debugCommand}"`],
    });

    const name = `${debugProvider.name} Process Console`;

    const terminal = await createRemoteTerminal(
      {
        name,
        iconPath: { id: "debug" },
      },
      { command: command.getCommand() }
    );
    terminal.show();

    this.disposable.push(
      vscode.window.onDidCloseTerminal(async (e) => {
        if (e.name === name) {
          if (vscode.debug.activeDebugSession) {
            await vscode.debug.stopDebugging(vscode.debug.activeDebugSession);
          }
        }
      })
    );

    return terminal;
  }

  async dispose() {
    this.disposable.forEach((d) => d.dispose());
    this.disposable.length = 0;
  }
}
