import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as JSON5 from "json5";

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
  isReload: boolean = false;
  terminal: RemoteTerminal;
  cancellationToken: DebugCancellationTokenSource;
  constructor(
    public workspaceFolder: vscode.WorkspaceFolder,
    public debugProvider: IDebugProvider,
    public node: ControllerResourceNode,
    public container: ContainerConfig,
    public configuration: vscode.DebugConfiguration
  ) {}
  public async launch() {
    if (!this.workspaceFolder) {
      return;
    }

    if (!this.container) {
      this.container = await getContainer(this.node);
    }
    await this.startDebug();
  }

  private async startDebug() {
    const { container, node } = this;

    const { port, dispose } = await this.debugProvider.getRemotePort(
      node,
      container
    );
    this.disposable.push({ dispose });

    const terminalName = `${this.debugProvider.name} Process Console`;
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

          const success = await this.debugProvider.startDebugging(
            this.workspaceFolder.uri.fsPath,
            debugSessionName,
            container,
            port,
            node,
            this.cancellationToken,
            this.configuration
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
            await this.debugProvider.waitDebuggerStop();

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

      this.createLaunch();
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

  async createLaunch() {
    const filePath = "./.vscode/launch.json";

    let launch: { configurations: vscode.DebugConfiguration[] };

    if (!fs.existsSync(filePath)) {
      const dir = path.dirname(filePath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      launch = { configurations: [] };
    } else {
      const str = fs.readFileSync(filePath).toString();

      launch = JSON5.parse(str);
    }

    if ("configurations" in launch) {
      const configurations = launch["configurations"];

      if (
        (Array.isArray(configurations) && configurations.length < 1) ||
        !configurations.find(
          (item) =>
            item.type === "nocalhost" &&
            item.request === "attach" &&
            item.name === "Nocalhost Debug"
        )
      ) {
        configurations.push({
          type: "nocalhost",
          request: "attach",
          name: "Nocalhost Debug",
        });

        fs.writeFileSync(filePath, JSON.stringify(launch, null, 2));
      }
    }
  }
  async dispose() {
    this.disposable.forEach((d) => d.dispose());
    this.disposable.length = 0;
  }
}
