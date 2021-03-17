import * as vscode from "vscode";

import ICommand from "./ICommand";

import { VIEW_KUBECONFIG } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { DevSpaceNode } from "../nodes/DevSpaceNode";

export default class ViewKubeConfigCommand implements ICommand {
  command: string = VIEW_KUBECONFIG;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: DevSpaceNode) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }

    const fsPath = node.getKubeConfigPath();
    const uri = vscode.Uri.parse(
      `Nocalhost://nh/kubeConfig/${node.label}.yaml?fsPath=${fsPath}&kubeConfigPath=${fsPath}`
    );
    let doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, { preview: false });
  }
}
