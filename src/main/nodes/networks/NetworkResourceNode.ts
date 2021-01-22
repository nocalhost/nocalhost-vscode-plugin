import * as vscode from "vscode";
import { KubernetesResourceNode } from "../abstract/KubernetesResourceNode";

export abstract class NetworkResourceNode extends KubernetesResourceNode {
  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    treeItem.contextValue = `network-${this.resourceType}`;
    return treeItem;
  }
}
