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
import { RemoteTerminal } from "./remoteTerminal";

export class DebugSession {
  disposable: Array<{ dispose(): any }> = [];
  container: ContainerConfig;
  node: ControllerResourceNode;
  isReload: boolean = false;
  terminal: RemoteTerminal;

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

    await this.createDebugTerminal(terminalName);

    const startDebugging = async () => {
      return await debugProvider.startDebugging(
        workspaceFolder.uri.fsPath,
        debugSessionName,
        container,
        port,
        node
      );
    };

    const success = await startDebugging();

    if (!success) {
      this.dispose();
    } else {
      this.liveReload(startDebugging);

      this.disposable.push(
        vscode.window.onDidCloseTerminal(async (e) => {
          if (
            e.name === terminalName &&
            vscode.debug.activeDebugSession &&
            !this.isReload
          ) {
            await vscode.debug.stopDebugging(vscode.debug.activeDebugSession);
          }
        }),
        vscode.debug.onDidTerminateDebugSession(async (debugSession) => {
          if (debugSession.name === debugSessionName && !this.isReload) {
            await debugProvider.waitStopDebug();

            await this.terminal.sendCtrlC();

            this.dispose();
          }
        })
      );
    }
  }
  liveReload(startDebugging: () => Promise<boolean>) {
    const { container, node } = this;
    if (container.dev.hotReload === true) {
      const liveReload = new LiveReload(node, async () => {
        this.isReload = true;

        if ((await this.terminal.restart()) && !(await startDebugging())) {
          this.dispose();
        }
        this.isReload = false;
      });

      this.disposable.push(liveReload);
    }
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
      spawn: { command },
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
