import * as vscode from "vscode";
import * as assert from "assert";

import { NhctlCommand, getRunningPodNames } from "./../ctl/nhctl";
import host from "../host";
import { ContainerConfig } from "../service/configService";
import {
  checkDebuggerInstalled,
  IDebugProvider,
  startDebugging,
} from "./provider";
import { LiveReload } from "../debug/liveReload";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import {
  checkRequiredCommand,
  getContainer,
  killContainerProcess,
} from "./index";
import { exec } from "../ctl/shell";

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

    await checkRequiredCommand(
      podNames[0],
      node.getNameSpace(),
      node.getKubeConfigPath()
    );

    await this.startDebug(debugProvider, workspaceFolder);
  }

  async startDebug(
    debugProvider: IDebugProvider,
    workspaceFolder: vscode.WorkspaceFolder
  ) {
    const { container, node } = this;
    const port =
      (container.dev.debug && container.dev.debug.remoteDebugPort) || 9229;

    await exec({
      command: NhctlCommand.nhctlPath,
      args: [
        "port-forward",
        "start",
        node.getAppName(),
        `-d ${node.name}`,
        `-t ${node.resourceType}`,
        `-p ${port}:${port}`,
        `-n ${node.getNameSpace()}`,
        `--kubeconfig ${node.getKubeConfigPath()}`,
      ],
    }).promise;

    await this.enterContainer();

    const debugSessionName = `${node.getAppName()}-${node.name}`;

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

      this.disposable.unshift(liveReload);
    }

    const success = await startDebugging(
      workspaceFolder.uri.fsPath,
      await debugProvider.getDebugConfiguration(
        debugSessionName,
        port,
        container.dev.workDir ?? "/home/nocalhost-dev"
      )
    );

    if (!success) {
      this.dispose();
      return;
    }
    this.disposable.push(
      vscode.debug.onDidTerminateDebugSession(async (debugSession) => {
        if (debugSession.name === debugSessionName) {
          await killContainerProcess(container, node, this.podName);

          if (this.isReload) {
            const debugSession = new DebugSession();

            host.withProgress({ title: "Waiting for reload ..." }, async () => {
              await debugSession.launch(
                workspaceFolder,
                debugProvider,
                this.node,
                this.container
              );
            });
          }
        }
      })
    );
  }

  async enterContainer() {
    const { container, node, podName } = this;

    await killContainerProcess(container, node, podName);

    const debugCommand = (container.dev.command?.debug ?? []).join(" ");

    const command = await NhctlCommand.exec({
      namespace: node.getNameSpace(),
      kubeConfigPath: node.getKubeConfigPath(),
      args: [
        podName,
        "-it",
        `-c nocalhost-dev`,
        `-- bash -c "${debugCommand}"`,
      ],
    });

    const name = `${node.getAppName()}-${node.name}`;

    const terminal = host.createTerminal({
      name,
      iconPath: { id: "debug-console" },
    });
    terminal.sendText(command.getCommand());
    terminal.sendText("clear");
    terminal.show();

    this.disposable = [
      vscode.window.onDidCloseTerminal(async (e) => {
        if (e.name === name) {
          this.dispose();
        }
      }),
    ];

    return terminal;
  }
  async dispose() {
    this.disposable.forEach((d) => d.dispose());
    this.disposable.length = 0;
  }
}
