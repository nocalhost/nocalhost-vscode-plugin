import * as vscode from "vscode";
import state from "../../state";
import { AppNode } from "../AppNode";
import { ID_SPLIT } from "../nodeContants";

import { BaseNocalhostNode } from "../types/nodeType";

export abstract class KubernetesResourceNode implements BaseNocalhostNode {
  abstract label: string;
  abstract type: string;
  abstract resourceType: string;
  abstract name: string;
  abstract info?: any;
  abstract parent: BaseNocalhostNode;

  getNodeStateId(): string {
    const parentStateId = this.parent.getNodeStateId();
    return `${parentStateId}${ID_SPLIT}${this.name}`;
  }

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

  public getAppNode(parent?: BaseNocalhostNode): AppNode {
    let node: BaseNocalhostNode | null | undefined;
    if (parent) {
      node = parent.getParent(parent);
    } else {
      node = this.getParent(this);
    }
    if (node instanceof AppNode) {
      return node;
    } else {
      return this.getAppNode(node as BaseNocalhostNode);
    }
  }

  public getKubeConfigPath() {
    const appNode = this.getAppNode();
    return appNode.getKUbeconfigPath();
  }

  public getAppName() {
    const appNode = this.getAppNode();
    return appNode.name;
  }
}
