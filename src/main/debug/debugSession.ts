import * as vscode from "vscode";
import * as getPort from "get-port";

import { NhctlCommand } from "./../ctl/nhctl";
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

    await this.startDebug(debugProvider, workspaceFolder);
  }

  async portForward(command: "end" | "start", localPort?: number) {
    const { container, node } = this;
    const { remoteDebugPort } = container.dev.debug;
    const port = localPort ?? (await getPort());

    await exec({
      command: NhctlCommand.nhctlPath,
      args: [
        "port-forward",
        command,
        node.getAppName(),
        `-d ${node.name}`,
        `-t ${node.resourceType}`,
        `-p ${port}:${remoteDebugPort}`,
        `-n ${node.getNameSpace()}`,
        `--kubeconfig ${node.getKubeConfigPath()}`,
      ],
    }).promise;

    if (command === "start") {
      this.disposable.push({
        dispose: async () => {
          await this.portForward("end", port);
        },
      });
    }

    return port;
  }

  async startDebug(
    debugProvider: IDebugProvider,
    workspaceFolder: vscode.WorkspaceFolder
  ) {
    const { container, node } = this;

    const port = await this.portForward("start");

    const terminal = await this.createTerminal(debugProvider);

    const debugSessionName = `${node.getAppName()}-${node.name}`;

    const success = await debugProvider.startDebugging(
      workspaceFolder.uri.fsPath,
      debugSessionName,
      container,
      port,
      node
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
                port,
                node
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
      const liveReload = new LiveReload(node, async () => {
        this.isReload = true;
        await vscode.debug.stopDebugging(vscode.debug.activeDebugSession);
      });

      this.disposable.push(liveReload);
    }
  }
  async createTerminal(debugProvider: IDebugProvider) {
    await closeTerminals();

    const { container, node } = this;
    const { debug } = container.dev.command;

    const name = `${debugProvider.name} Process Console`;

    const terminal = await createRemoteTerminal(
      {
        name,
        iconPath: { id: "debug" },
      },
      { commands: debug, node }
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
