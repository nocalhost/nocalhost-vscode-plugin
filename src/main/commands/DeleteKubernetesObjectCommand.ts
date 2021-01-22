import * as vscode from "vscode";
import ICommand from "./ICommand";
import { DELETE_KUBERNETES_OBJECT } from "./constants";
import registerCommand from "./register";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import host from "../host";
import services, { ServiceResult } from "../common/DataCenter/services";

export default class DeleteKubernetesObjectCommand implements ICommand {
  command: string = DELETE_KUBERNETES_OBJECT;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: ControllerResourceNode) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    const kind: string = node.resourceType;
    const nodeName: string = node.name;
    const namespace: string = node.getAppNode().namespace;
    const kubeConfig: string = node.getKubeConfigPath();
    const result: ServiceResult = await services.deleteKubernetesObject(
      kind,
      nodeName,
      namespace,
      kubeConfig
    );
    if (result.success) {
      host.showInformationMessage(result.value);
      vscode.commands.executeCommand("Nocalhost.refresh");
    } else {
      host.showErrorMessage(result.value);
    }
  }
}
