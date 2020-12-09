import * as vscode from "vscode";

import ICommand from "./ICommand";

import { WRITE_SERVICE_CONFIG } from "./constants";
import registerCommand from "./register";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";

export default class WriteServiceConfigCommand implements ICommand {
  command: string = WRITE_SERVICE_CONFIG;
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
