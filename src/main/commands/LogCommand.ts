import * as vscode from "vscode";
import ICommand from "./ICommand";
import { LOG } from "./constants";
import registerCommand from "./register";
import host from "../host";
import * as kubectl from "../ctl/kubectl";
import * as shell from "../ctl/shell";
import { KubernetesResourceNode } from "../nodes/abstract/KubernetesResourceNode";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import { Pod } from "../nodes/workloads/pod/Pod";
import NocalhostWebviewPanel from "../webview/NocalhostWebviewPanel";

export default class LogCommand implements ICommand {
  command: string = LOG;
  private timer: NodeJS.Timer | null = null;
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

    if (podName && containerName) {
      const kubeConfig: string = node.getKubeConfigPath();
      NocalhostWebviewPanel.open({
        url: "/logs",
        title: `${podName}/${containerName}`,
        newTab: true,
        query: {
          logId: node.getNodeStateId(),
          pod: podName,
          container: containerName,
          kubeConfig,
        },
      });
    }
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
      const podNameArr = await kubectl.getPodNames(
        node.name,
        node.resourceType,
        node.getKubeConfigPath()
      );
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
    const containerNameArr = await kubectl.getContainerNames(
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
}
