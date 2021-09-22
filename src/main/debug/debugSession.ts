import * as vscode from "vscode";
import * as assert from "assert";
const retry = require("async-retry");

import { NhctlCommand, getRunningPodNames } from "./../ctl/nhctl";
import host from "../host";
import { ContainerConfig } from "../service/configService";
import { IDebugProvider } from "./provider/iDebugProvider";
import { LiveReload } from "../debug/liveReload";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import {
  checkRequiredCommand,
  getContainer,
  killContainerCommandProcess,
} from "./index";
import { exec } from "../ctl/shell";

export class DebugSession {
  disposable: Array<{ dispose(): any }> = [];
  container: ContainerConfig;
  node: ControllerResourceNode;
  podName: string;

  public async launch(
    workspaceFolder: vscode.WorkspaceFolder,
    debugProvider: IDebugProvider,
    node: ControllerResourceNode,
    container?: ContainerConfig
  ) {
    if (!workspaceFolder) {
      return;
    }

    const isInstalled = await debugProvider.isDebuggerInstalled();
    if (!isInstalled) {
      host.showInformationMessage("please install dependent extension.");
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

    const cwd = workspaceFolder.uri.fsPath;
    const workDir = container.dev.workDir || "/home/nocalhost-dev";

    await this.enterContainer();

    if (container.dev.hotReload === true) {
      const liveReload = new LiveReload(
        {
          namespace: node.getNameSpace(),
          kubeConfigPath: node.getKubeConfigPath(),
          resourceType: node.resourceType,
          app: node.getAppName(),
          service: node.name,
        },
        () => {
          this.startDebug(debugProvider, workspaceFolder);
        }
      );

      this.disposable.unshift(liveReload);
    }

    const debugSessionName = `${node.getAppName()}-${node.name}`;

    const success = await debugProvider.startDebug(
      cwd,
      debugSessionName,
      port,
      workDir
    );

    if (!success) {
      this.dispose();
      return;
    }

    vscode.debug.onDidTerminateDebugSession(async (debugSession) => {
      if (debugSession.name === debugSessionName) {
        this.dispose();
      }
    });
  }

  async enterContainer() {
    const { container, node, podName } = this;

    await killContainerCommandProcess(container, node, podName);

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

    const name = "debug:" + `${node.getAppName()}-${node.name}`;

    let terminal = host.invokeInNewTerminal(command.getCommand(), name);

    this.disposable = [
      terminal,
      vscode.window.onDidCloseTerminal(async (e) => {
        if (e.name === name) {
          this.dispose();
        }
      }),
    ];
  }
  async dispose() {
    this.disposable.forEach((d) => d.dispose());
    this.disposable.length = 0;
  }
}
