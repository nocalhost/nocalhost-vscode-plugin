import * as vscode from "vscode";

import ICommand from "./ICommand";
import { LOAD_RESOURCE } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { KubernetesResourceNode } from "../nodes/abstract/KubernetesResourceNode";
import { AppNode } from "../nodes/AppNode";

export default class LoadResourceCommand implements ICommand {
  command: string = LOAD_RESOURCE;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: KubernetesResourceNode | AppNode) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    if (node instanceof KubernetesResourceNode) {
      const kind = node.resourceType;
      const name = node.name;
      const uri = vscode.Uri.parse(
        `Nocalhost://k8s/loadResource/${kind}/${name}.yaml?id=${node.getNodeStateId()}&time=${+new Date()}`
      );
      let doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { preview: true });
    } else if (node instanceof AppNode) {
      if (!node.installed()) {
        host.showInformationMessage(`${node.label} is not installed.`);
        return;
      }
      const name = node.name;
      const uri = vscode.Uri.parse(
        `Nocalhost://nh/loadResource/${name}.yaml?time=${+new Date()}`
      );
      let doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { preview: true });
    }
  }
}
