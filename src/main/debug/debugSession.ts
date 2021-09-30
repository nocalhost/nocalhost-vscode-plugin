import * as vscode from "vscode";
import * as getPort from "get-port";

import { NhctlCommand } from "./../ctl/nhctl";
import { ContainerConfig } from "../service/configService";
import { checkDebuggerInstalled } from "./provider";
import { LiveReload } from "../debug/liveReload";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import { DebugCancellationTokenSource, getContainer } from "./index";
import { exec } from "../ctl/shell";
import { IDebugProvider } from "./provider/IDebugProvider";
import { RemoteTerminal } from "./remoteTerminal";
import host from "../host";

export class DebugSession {
  disposable: Array<{ dispose(): any }> = [];
  container: ContainerConfig;
  node: ControllerResourceNode;
  isReload: boolean = false;
  terminal: RemoteTerminal;
  cancellationToken: DebugCancellationTokenSource;

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

    const terminalName = `${debugProvider.name} Process Console`;
    const debugSessionName = `${node.getAppName()}-${node.name}`;

    this.generateCancellationToken();
    await this.createDebugTerminal(terminalName);

    const startDebugging = async () => {
      return await host.withProgress(
        {
          title: "Attempt to connect to the remote debug...",
          cancellable: true,
        },
        async (_, token) => {
          token.onCancellationRequested(() => {
            host.showWarnMessage("Cancel remote debugging");

            this.cancellationToken.cancelByReason("cancel");
          });

          const success = await debugProvider.startDebugging(
            workspaceFolder.uri.fsPath,
            debugSessionName,
            container,
            port,
            node,
            this.cancellationToken
          );

          return success;
        }
      );
    };
    const success = await startDebugging();
    this.cancellationToken.dispose();
    this.cancellationToken = null;

    if (!success) {
      this.dispose();
    } else {
      this.liveReload();

      this.disposable.push(
        vscode.window.onDidCloseTerminal(async (e) => {
          if (
            (await e.processId) === (await this.terminal.processId) &&
            vscode.debug.activeDebugSession &&
            !this.isReload
          ) {
            await vscode.debug.stopDebugging(vscode.debug.activeDebugSession);
          }
        }),
        vscode.debug.onDidTerminateDebugSession(async (debugSession) => {
          if (debugSession.name === debugSessionName) {
            if (this.isReload) {
              this.generateCancellationToken();

              if (!(await startDebugging())) {
                this.dispose();
              }

              this.cancellationToken.dispose();
              this.cancellationToken = null;

              this.isReload = false;
            } else {
              await debugProvider.waitStopDebug();
              await this.terminal.sendCtrlC();

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
        await this.terminal.restart();
      });

      this.disposable.push(liveReload);
    }
  }
  generateCancellationToken() {
    if (this.cancellationToken) {
      this.cancellationToken.dispose();
    }

    this.cancellationToken = new DebugCancellationTokenSource();
  }
  async createDebugTerminal(name: string) {
    const { container, node } = this;
    const { debug } = container.dev.command;

    const command = NhctlCommand.exec({
      app: node.getAppName(),
      name: node.name,
      namespace: node.getNameSpace(),
      kubeConfigPath: node.getKubeConfigPath(),
      resourceType: node.resourceType,
      commands: debug,
    }).getCommand();

    let terminal = await RemoteTerminal.create({
      terminal: {
        name,
        iconPath: { id: "debug" },
      },
      spawn: {
        command,
        close: (code: number, signal: NodeJS.Signals) => {
          if (this.cancellationToken && code !== 0 && !this.isReload) {
            this.cancellationToken.cancelByReason("failed");
            host.showErrorMessage("Failed to start debug");
          }
        },
      },
    });

    terminal.show();
    this.terminal = terminal;

    this.disposable.push(this.terminal);
  }

  async dispose() {
    this.disposable.forEach((d) => d.dispose());
    this.disposable.length = 0;
  }
}
