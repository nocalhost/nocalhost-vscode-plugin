import * as vscode from "vscode";

import { NhctlCommand } from "./../ctl/nhctl";
import { ContainerConfig } from "../service/configService";
import { LiveReload } from "../debug/liveReload";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import { DebugCancellationTokenSource, getContainer } from "./index";
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

    if (!container) {
      container = await getContainer(node);
    }
    this.container = container;
    this.node = node;

    host.getContext().subscriptions.push({
      dispose: () => {
        this.dispose();
      },
    });
    await this.startDebug(debugProvider, workspaceFolder);
  }

  async startDebug(
    debugProvider: IDebugProvider,
    workspaceFolder: vscode.WorkspaceFolder
  ) {
    const { container, node } = this;

    const { port, dispose } = await debugProvider.getRemotePort(
      node,
      container
    );
    this.disposable.push({ dispose });

    const terminalName = `${debugProvider.name} Process Console`;
    const debugSessionName = `${node.getAppName()}-${node.name}`;

    this.generateCancellationToken();
    await this.createDebugTerminal(terminalName);

    const startDebugging = async () => {
      return await host.withProgress(
        {
          title: "Attempt to connect to the remote debugger ...",
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
            await debugProvider.waitDebuggerStop();

            if (this.isReload) {
              this.generateCancellationToken();

              if (
                (await this.terminal.restart()) &&
                !(await startDebugging())
              ) {
                this.dispose();
              }

              this.cancellationToken.dispose();
              this.cancellationToken = null;
              this.isReload = false;
            } else {
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

        vscode.debug.stopDebugging(vscode.debug.activeDebugSession);
      });

      this.disposable.push(liveReload);
    }
  }
  generateCancellationToken() {
    if (this.cancellationToken) {
      this.cancellationToken.dispose();
    }

    this.cancellationToken = new DebugCancellationTokenSource();

    this.disposable.push({
      dispose: () => {
        if (this.cancellationToken) {
          this.dispose();
        }
      },
    });
  }
  async createDebugTerminal(name: string) {
    const { container, node } = this;
    const { debug } = container.dev.command;

    debug.unshift("env", "NH_PLUGIN=VSCode");

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
        close: (code: number) => {
          if (this.cancellationToken && code !== 0 && !this.isReload) {
            this.cancellationToken.cancelByReason("failed");
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
