import * as vscode from "vscode";

import ICommand from "./ICommand";
import { WRITE_SERVICE_CONFIG } from "./constants";
import registerCommand from "./register";
import { getServiceConfig } from "../ctl/nhctl";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import host from "../host";

export default class WriteServiceConfigCommand implements ICommand {
  command: string = WRITE_SERVICE_CONFIG;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: ControllerResourceNode) {
    if (!node) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }
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
    const appNode = node.getAppNode();
    const uri = vscode.Uri.parse(
      `${protocol}://nh/config/app/${appNode.name}/services/${
        node.name
      }.yaml?appName=${node.getAppName()}&nodeName=${node.name}&resourceType=${
        node.resourceType
      }&workloadType=${node.resourceType}&id=${node.getNodeStateId()}&kubeConfigPath=${node.getKubeConfigPath()}&namespace=${node.getNameSpace()}`
    );
    let doc = await vscode.workspace.openTextDocument(uri);
    vscode.window.showTextDocument(doc, { preview: true });
  }
}
