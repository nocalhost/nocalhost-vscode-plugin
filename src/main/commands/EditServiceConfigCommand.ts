import * as vscode from "vscode";

import ICommand from "./ICommand";
import { getServiceConfig } from "../ctl/nhctl";
import { EDIT_SERVICE_CONFIG, CONFIG_URI_QUERY } from "./constants";
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
      host.showWarnMessage("Failed to get node configs, please try again.");
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
      `${protocol}://nh/config/app/${appNode.name}/services/${node.name}.yaml`
    );
    host.setGlobalState(
      CONFIG_URI_QUERY,
      `appName=${node.getAppName()}&nodeName=${node.name}&resourceType=${
        node.resourceType
      }&id=${node.getNodeStateId()}&kubeConfigPath=${node.getKubeConfigPath()}&namespace=${node.getNameSpace()}&workloadType=${
        node.resourceType
      }`
    );
    let doc = await vscode.workspace.openTextDocument(uri);
    vscode.window.showTextDocument(doc, { preview: true });

    // show web edit
    const res = await host.showInformationMessage(
      "Do you want to open the browser to edit config?",
      { modal: true },
      "go"
    );

    if (res === "go") {
      const uri = vscode.Uri.parse(`https://nocalhost.dev/tools?from=daemon`);
      vscode.env.openExternal(uri);
    }
  }
}
