import * as vscode from "vscode";

import ICommand from "./ICommand";
import { LOAD_RESOURCE } from "./constants";
import registerCommand from "./register";
import { AppFolderNode, KubernetesResourceNode } from "../nodes/nodeType";
import host from "../host";

export default class LoadResourceCommand implements ICommand {
  command: string = LOAD_RESOURCE;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: KubernetesResourceNode | AppFolderNode) {
    if (node instanceof KubernetesResourceNode) {
      const kind = node.resourceType;
      const name = node.name;
      const uri = vscode.Uri.parse(
        `Nocalhost://k8s/loadResource/${kind}/${name}.yaml`
      );
      let doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { preview: false });
    } else if (node instanceof AppFolderNode) {
      if (!node.installed()) {
        host.showInformationMessage(`${node.label} is not installed.`);
        return;
      }
      const name = node.info.name;
      const uri = vscode.Uri.parse(`Nocalhost://nh/loadResource/${name}.yaml`);
      let doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { preview: false });
    }
  }
}
