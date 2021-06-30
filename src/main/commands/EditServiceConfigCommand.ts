import * as vscode from "vscode";

import ICommand from "./ICommand";
import { getServiceConfig } from "../ctl/nhctl";
import { EDIT_SERVICE_CONFIG } from "./constants";
import registerCommand from "./register";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import host from "../host";

export default class EditServiceConfigCommand implements ICommand {
  command: string = EDIT_SERVICE_CONFIG;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: ControllerResourceNode) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    const appNode = node.getAppNode();
    let protocol = "NocalhostRW";
    const svcProfile = await getServiceConfig(
      node.getKubeConfigPath(),
      node.getNameSpace(),
      node.getAppName(),
      node.name,
      node.resourceType
    );
    if (
      svcProfile.localconfigloaded ||
      svcProfile.cmconfigloaded ||
      svcProfile.annotationsconfigloaded
    ) {
      protocol = "Nocalhost";
    }
    const uri = vscode.Uri.parse(
      `${protocol}://nh/config/app/${appNode.name}/services/${
        node.name
      }.yaml?appName=${node.getAppName()}&nodeName=${node.name}&resourceType=${
        node.resourceType
      }&id=${node.getNodeStateId()}&kubeConfigPath=${node.getKubeConfigPath()}&namespace=${node.getNameSpace()}&workloadType=${
        node.resourceType
      }`
    );
    let doc = await vscode.workspace.openTextDocument(uri);
    vscode.window.showTextDocument(doc, { preview: true });
  }
}
