import * as vscode from "vscode";

import ICommand from "./ICommand";
import { EXEC } from "./constants";
import registerCommand from "./register";
import host, { Host } from "../host";
import { CURRENT_KUBECONFIG_FULLPATH } from "../constants";
import { ControllerNodeApi } from "./StartDevModeCommand";
import * as kubectl from "../ctl/kubectl";
import * as fileStore from "../store/fileStore";
import { DeploymentStatus } from "../nodes/types/nodeType";
import { Resource, PodResource } from "../nodes/types/resourceType";

export default class ExecCommand implements ICommand {
  command: string = EXEC;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: ControllerNodeApi) {
    await this.exec(host, node);
  }

  async exec(host: Host, node: ControllerNodeApi) {
    const status = await node.getStatus();
    if (status === DeploymentStatus.developing) {
      await this.opendevSpaceExec(host, node.resourceType, node.name);
    } else {
      await this.openExec(host, node.resourceType, node.name);
    }
  }

  async opendevSpaceExec(host: Host, type: string, workloadName: string) {
    const resArr = await kubectl.getControllerPod(host, type, workloadName);
    if (resArr && resArr.length <= 0) {
      host.showErrorMessage("Not found pod");
      return;
    }
    const podName = (resArr as Array<Resource>)[0].metadata.name;
    const kubeconfigPath = fileStore.get(CURRENT_KUBECONFIG_FULLPATH);
    const command = `kubectl exec -it ${podName} -c nocalhost-dev --kubeconfig ${kubeconfigPath} -- /bin/sh`;
    const terminalDisposed = host.invokeInNewTerminal(command, podName);
    host.pushDebugDispose(terminalDisposed);
    host.showInformationMessage("DevSpace terminal Opened");
    host.log("", true);
  }

  /**
   * exec
   * @param host
   * @param type
   * @param workloadName
   */
  async openExec(host: Host, type: string, workloadName: string) {
    host.log("open container ...", true);
    host.showInformationMessage("open container ...");
    const resArr = await kubectl.getControllerPod(host, type, workloadName);
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
    const podStr = await kubectl.loadResource(host, "pod", podName, "json");
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
    const kubeconfigPath = fileStore.get(CURRENT_KUBECONFIG_FULLPATH);
    const command = `kubectl exec -it ${podName} -c nocalhost-dev --kubeconfig ${kubeconfigPath} -- /bin/sh`;
    const terminalDisposed = host.invokeInNewTerminal(command, podName);
    host.pushDebugDispose(terminalDisposed);
    host.log("open container end", true);
    host.log("", true);
  }
}
