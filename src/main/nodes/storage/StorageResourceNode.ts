import vscode from "vscode";
import { KubernetesResourceNode } from "../abstract/KubernetesResourceNode";

export abstract class StorageResourceNode extends KubernetesResourceNode {
  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    treeItem.contextValue = `storage-${this.resourceType}`;
    return treeItem;
  }
}
