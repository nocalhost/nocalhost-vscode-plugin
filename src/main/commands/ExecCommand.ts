import * as vscode from "vscode";

import ICommand from "./ICommand";
import { EXEC } from "./constants";
import registerCommand from "./register";
import host, { Host } from "../host";
import { ControllerNodeApi } from "./StartDevModeCommand";
import * as kubectl from "../ctl/kubectl";
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
      await this.opendevSpaceExec(
        node.getKubeConfigPath(),
        node.resourceType,
        node.name
      );
    } else {
      await this.openExec(
        node.getKubeConfigPath(),
        node.resourceType,
        node.name
      );
    }
  }

  async opendevSpaceExec(
    kubeConfigPath: string,
    type: string,
    workloadName: string
  ) {
    const resArr = await kubectl.getControllerPod(
      kubeConfigPath,
      type,
      workloadName
    );
    if (resArr && resArr.length <= 0) {
      host.showErrorMessage("Not found pod");
      return;
    }
    const podName = (resArr as Array<Resource>)[0].metadata.name;
    await this.execCore(kubeConfigPath, podName, "nocalhost-dev");
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
    host.log("open container ...", true);
    host.showInformationMessage("open container ...");
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
