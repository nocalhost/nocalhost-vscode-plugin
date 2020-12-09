import * as vscode from "vscode";

import { BaseNocalhostNode } from "../types/nodeType";

export abstract class KubernetesResourceNode implements BaseNocalhostNode {
  abstract getNodeStateId(): string;
  abstract label: string;
  abstract type: string;
  abstract resourceType: string;
  abstract name: string;
  abstract info?: any;
  abstract parent: BaseNocalhostNode;

  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    return Promise.resolve([]);
  }
  getTreeItem(): vscode.TreeItem | Promise<vscode.TreeItem> {
    let treeItem = new vscode.TreeItem(
      this.label,
      vscode.TreeItemCollapsibleState.None
    );
    treeItem.label = this.label;
    treeItem.command = {
      command: "Nocalhost.loadResource",
      title: "loadResource",
      arguments: [this],
    };
    return treeItem;
  }
}
