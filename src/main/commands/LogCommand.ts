import * as vscode from "vscode";
import ICommand from "./ICommand";
import { LOG } from "./constants";
import registerCommand from "./register";
import host from "../host";
import * as nhctl from "../ctl/nhctl";
import { KubernetesResourceNode } from "../nodes/abstract/KubernetesResourceNode";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import { Pod } from "../nodes/workloads/pod/Pod";
import NocalhostWebviewPanel from "../webview/NocalhostWebviewPanel";

export default class LogCommand implements ICommand {
  command: string = LOG;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: KubernetesResourceNode) {
    if (!node) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }
    let podName: string | undefined;
    let containerName: string | undefined;
    ({ podName, containerName } = await this.getPodAndContainer(node));

    if (podName && containerName) {
      NocalhostWebviewPanel.open({
        url: "/logs",
        title: `${podName}/${containerName}`,
        newTab: true,
        query: {
          id: node.getNodeStateId(),
          app: node.getAppName(),
          pod: podName,
          namespace: node.getNameSpace(),
          container: containerName,
        },
      });
    } else {
      vscode.window.showInformationMessage(
        `Pod is not ready, please try again later`
      );
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
      const podNameArr = await nhctl.getPodNames({
        name: node.name,
        kind: node.resourceType,
        namespace: node.getNameSpace(),
        kubeConfigPath: node.getKubeConfigPath(),
      });
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
    const containerNameArr = await nhctl.getContainers({
      appName: node.getAppName(),
      name: node.name,
      resourceType: node.resourceType,
      kubeConfigPath: node.getKubeConfigPath(),
      namespace: node.getNameSpace(),
    });
    result.containerName = containerNameArr[0];
    if (containerNameArr.length > 1) {
      result.containerName = await vscode.window.showQuickPick(
        containerNameArr
      );
    }
    return result;
  }
}
