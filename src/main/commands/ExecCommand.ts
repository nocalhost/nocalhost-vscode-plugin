import * as vscode from "vscode";

import ICommand from "./ICommand";
import { EXEC } from "./constants";
import registerCommand from "./register";
import host, { Host } from "../host";
import { ControllerNodeApi } from "./StartDevModeCommand";
import * as kubectl from "../ctl/kubectl";
import * as nhctl from "../ctl/nhctl";
import { DeploymentStatus } from "../nodes/types/nodeType";
import { Resource, PodResource } from "../nodes/types/resourceType";

export default class ExecCommand implements ICommand {
  command: string = EXEC;
  static defaultShells = ["zsh", "bash"];
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: ControllerNodeApi) {
    await this.exec(host, node);
  }

  async exec(host: Host, node: ControllerNodeApi) {
    const status = await node.getStatus();
    if (status === DeploymentStatus.developing) {
      await this.opendevSpaceExec(node.getAppName(), node.name);
    } else {
      await this.openExec(
        node.getKubeConfigPath(),
        node.resourceType,
        node.name
      );
    }
  }

  async opendevSpaceExec(appName: string, workloadName: string) {
    host.log("Opening DevSpace terminal", true);
    host.showInformationMessage("Opening DevSpace terminal");
    const terminalCommand = nhctl.terminalCommand(appName, workloadName);
    const terminalDisposed = host.invokeInNewTerminal(
      terminalCommand,
      workloadName
    );
    host.pushDebugDispose(terminalDisposed);
    host.showInformationMessage("DevSpace terminal Opened");
    host.log("", true);
  }

  private async execCore(
    kubeConfigPath: string,
    podName: string,
    containerName: string
  ) {
    let shell = '/bin/sh -c "(zsh||bash||sh)"';
    const command = `kubectl exec -it ${podName} -c ${containerName} --kubeconfig ${kubeConfigPath} -- ${shell}`;
    const terminalDisposed = host.invokeInNewTerminal(command, podName);
    host.pushDebugDispose(terminalDisposed);
  }

  /**
   * exec
   * @param host
   * @param type
   * @param workloadName
   */
  async openExec(kubeConfigPath: string, type: string, workloadName: string) {
    const resArr = await kubectl.getControllerPod(
      kubeConfigPath,
      type,
      workloadName
    );
    if (resArr && resArr.length <= 0) {
      host.showErrorMessage("Not found pod");
      return;
    }
    const podNameArr = (resArr as Array<Resource>).map((res) => {
      return res.metadata.name;
    });
    let podName: string | undefined = podNameArr[0];
    if (podNameArr.length > 1) {
      podName = await vscode.window.showQuickPick(podNameArr);
    }
    if (!podName) {
      return;
    }
    const podStr = await kubectl.loadResource(
      kubeConfigPath,
      "pod",
      podName,
      "json"
    );
    const pod = JSON.parse(podStr as string) as PodResource;
    const containerNameArr = pod.spec.containers.map((c) => {
      return c.name;
    });
    let containerName: string | undefined = containerNameArr[0];
    if (containerNameArr.length > 1) {
      containerName = await vscode.window.showQuickPick(containerNameArr);
    }
    if (!containerName) {
      return;
    }
    await this.execCore(kubeConfigPath, podName, containerName);
    host.log("open container end", true);
    host.log("", true);
  }
}
