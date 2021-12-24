import * as vscode from "vscode";

import ICommand from "./ICommand";

import { VIEW_KUBECONFIG } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { KubeConfigNode } from "../nodes/KubeConfigNode";

export default class ViewKubeConfigCommand implements ICommand {
  command: string = VIEW_KUBECONFIG;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: KubeConfigNode) {
    if (!node) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }

    const fsPath = node.kubeConfigPath;
    const uri = vscode.Uri.parse(
      `Nocalhost://nh/kubeConfig/${node.label}.yaml?fsPath=${fsPath}&kubeConfigPath=${fsPath}`
    );
    let doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, { preview: false });
  }
}
