import * as vscode from "vscode";

import ICommand from "./ICommand";

import { EDIT_APP_CONFIG } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { AppNode } from "../nodes/AppNode";

export default class EditAppConfigCommand implements ICommand {
  command: string = EDIT_APP_CONFIG;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: AppNode) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    const uri = vscode.Uri.parse(
      `NocalhostRW://nh/config/app/${
        node.name
      }.yaml?id=${node.getNodeStateId()}&kubeConfigPath=${node.getKubeConfigPath()}`
    );
    let doc = await vscode.workspace.openTextDocument(uri);
    vscode.window.showTextDocument(doc, { preview: true });
  }
}
