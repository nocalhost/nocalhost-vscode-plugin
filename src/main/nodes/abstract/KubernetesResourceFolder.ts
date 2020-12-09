import state from "../../state";
import * as vscode from "vscode";

import { NocalhostFolderNode } from "./NocalhostFolderNode";

export abstract class KubernetesResourceFolder extends NocalhostFolderNode {
  public abstract label: string;
  public abstract type: string;
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    const collapseState =
      state.get(this.getNodeStateId()) ||
      vscode.TreeItemCollapsibleState.Collapsed;
    let treeItem = new vscode.TreeItem(this.label, collapseState);
    return treeItem;
  }
}
