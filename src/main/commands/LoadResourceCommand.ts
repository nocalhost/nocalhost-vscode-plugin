import * as vscode from "vscode";
import ICommand from "./ICommand";
import { LOAD_RESOURCE } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { KubernetesResourceNode } from "../nodes/abstract/KubernetesResourceNode";
import { AppNode } from "../nodes/AppNode";
import TextDocumentContentProvider from "../textDocumentContentProvider";

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
      if (!node) {
        host.showWarnMessage("A task is running, please try again later");
        return;
      }
      const kind: string = node.resourceType;
      const name: string = node.name;
      const uri: vscode.Uri = vscode.Uri.parse(
        `NocalhostRW://k8s/loadResource/${kind}/${name}.yaml?id=${node.getNodeStateId()}`
      );
      const doc: vscode.TextDocument = await vscode.workspace.openTextDocument(
        uri
      );
      await vscode.window.showTextDocument(doc, {
        preview: false,
        preserveFocus: false,
      });
    } else if (node instanceof AppNode) {
      if (!node.installed()) {
        host.showInformationMessage(`${node.label} is not installed.`);
        return;
      }
      const name: string = node.name;
      const uri: vscode.Uri = vscode.Uri.parse(
        `nhtext://loadresource/${name}.yaml?type=nh&name=${name}`
      );
      let doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { preview: true });
      TextDocumentContentProvider.getInstance().update(uri);
    }
  }
}
