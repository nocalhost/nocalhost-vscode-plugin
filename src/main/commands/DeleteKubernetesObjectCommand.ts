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
    const confirm:
      | string
      | undefined = await vscode.window.showInformationMessage(
      `Delete: ${nodeName}?`,
      { modal: true },
      "OK"
    );
    if (confirm !== "OK") {
      return;
    }
    await vscode.window.withProgress(
      {
        title: `Deleting, please wait...`,
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
      },
      async (progress) => {
        const result: ServiceResult = await services.deleteKubernetesObject(
          kind,
          nodeName,
          namespace,
          kubeConfig
        );
        const { success, value } = result;
        if (success) {
          host.showInformationMessage(value);
          vscode.commands.executeCommand("Nocalhost.refresh");
        } else {
          host.showErrorMessage(value);
        }
      }
    );
  }
}
