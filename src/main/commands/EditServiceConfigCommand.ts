import * as vscode from "vscode";

import ICommand from "./ICommand";

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
    const uri = vscode.Uri.parse(
      `NocalhostRW://nh/config/app/${appNode.label}/services/${
        node.name
      }.yaml?id=${node.getNodeStateId()}`
    );
    let doc = await vscode.workspace.openTextDocument(uri);
    vscode.window.showTextDocument(doc, { preview: false });
  }
}
