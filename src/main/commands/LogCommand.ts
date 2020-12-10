import * as vscode from "vscode";

import ICommand from "./ICommand";
import { LOG } from "./constants";
import registerCommand from "./register";
import host from "../host";
import * as kubectl from "../ctl/kubectl";
import { KubernetesResourceNode } from "../nodes/abstract/KubernetesResourceNode";
import { Resource, PodResource } from "../nodes/types/resourceType";

export default class LogCommand implements ICommand {
  command: string = LOG;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: KubernetesResourceNode) {
    const kind = node.resourceType;
    const name = node.name;
    const appNode = node.getAppNode();
    const resArr = await kubectl.getControllerPod(
      appNode.getKUbeconfigPath(),
      kind,
      name
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
      appNode.getKUbeconfigPath(),
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

    const uri = vscode.Uri.parse(
      `Nocalhost://k8s/log/${podName}/${containerName}?id=${node.getNodeStateId()}`
    );
    let doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, { preview: false });
  }
}
