import * as vscode from "vscode";

import { ID_SPLIT } from "./nodeContants";
import { BaseNocalhostNode } from "./types/nodeType";

export class NocalhostAccountNode implements BaseNocalhostNode {
  label: string;
  type: string = "account";
  parent: BaseNocalhostNode;

  constructor(parent: BaseNocalhostNode, label: string) {
    this.parent = parent;
    this.label = label;
  }
  getNodeStateId(): string {
    return `${this.parent.getNodeStateId()}${ID_SPLIT}${this.type}`;
  }
  getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    return Promise.resolve([]);
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let treeItem = new vscode.TreeItem(
      this.label,
      vscode.TreeItemCollapsibleState.None
    );
    treeItem.iconPath = new vscode.ThemeIcon("account");
    return treeItem;
  }
  getParent(element?: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
}
