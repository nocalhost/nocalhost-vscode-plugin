import * as vscode from "vscode";

import ICommand from "./ICommand";
import { LOG } from "./constants";
import registerCommand from "./register";
import host from "../host";
import * as kubectl from "../ctl/kubectl";
import { KubernetesResourceNode } from "../nodes/abstract/KubernetesResourceNode";
import { Resource, PodResource } from "../nodes/types/resourceType";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import { Pod } from "../nodes/workloads/pod/Pod";

export default class LogCommand implements ICommand {
  command: string = LOG;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: KubernetesResourceNode) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    let podName: string | undefined;
    let containerName: string | undefined;
    ({ podName, containerName } = await this.getPodAndContainer(node));
    if (!podName || !containerName) {
      return;
    }
    const uri = vscode.Uri.parse(
      `Nocalhost://k8s/log/${podName}/${containerName}?id=${node.getNodeStateId()}`
    );
    let doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc, {
      preview: false,
    });
    const lineCount = editor.document.lineCount;
    const range = editor.document.lineAt(lineCount - 1).range;
    editor.selection = new vscode.Selection(range.end, range.end);
    editor.revealRange(range);
  }

  async getPodAndContainer(
    node: KubernetesResourceNode
  ): Promise<{
    podName: string | undefined;
    containerName: string | undefined;
  }> {
    let result: {
      podName: string | undefined;
      containerName: string | undefined;
    } = {
      podName: "",
      containerName: "",
    };

    if (node instanceof ControllerResourceNode) {
      const podNameArr = await this.getPods(node);
      result.podName = podNameArr[0];
      if (podNameArr.length > 1) {
        result.podName = await vscode.window.showQuickPick(podNameArr);
      }
      if (!result.podName) {
        return result;
      }
    } else if (node instanceof Pod) {
      result.podName = node.name;
    } else {
      return result;
    }
    const containerNameArr = await this.getContainers(
      result.podName,
      node.getKubeConfigPath()
    );
    result.containerName = containerNameArr[0];
    if (containerNameArr.length > 1) {
      result.containerName = await vscode.window.showQuickPick(
        containerNameArr
      );
    }
    return result;
  }

  async getPods(node: ControllerResourceNode) {
    const kind = node.resourceType;
    const name = node.name;
    let podNameArr: Array<string> = [];
    const resArr = await kubectl.getControllerPod(
      node.getKubeConfigPath(),
      kind,
      name
    );
    if (resArr && resArr.length <= 0) {
      return podNameArr;
    }
    podNameArr = (resArr as Array<Resource>).map((res) => {
      return res.metadata.name;
    });
    return podNameArr;
  }

  async getContainers(podName: string, kubeConfigPath: string) {
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

    return containerNameArr;
  }
}
