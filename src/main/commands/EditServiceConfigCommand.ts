import * as vscode from "vscode";

import ICommand from "./ICommand";

import { EDIT_SERVICE_CONFIG } from "./constants";
import { ControllerResourceNode } from "../nodes/nodeType";
import registerCommand from "./register";

export default class EditServiceConfigCommand implements ICommand {
  command: string = EDIT_SERVICE_CONFIG;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: ControllerResourceNode) {
    const appNode = node.getAppNode();
    const uri = vscode.Uri.parse(
      `NocalhostRW://nh/config/app/${appNode.label}/services/${node.name}.yaml`
    );
    let doc = await vscode.workspace.openTextDocument(uri);
    vscode.window.showTextDocument(doc, { preview: false });
  }
}
