import * as vscode from "vscode";
import { KubernetesResourceNode } from "../abstract/KubernetesResourceNode";

export abstract class ConfigurationResourceNode extends KubernetesResourceNode {
  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    treeItem.contextValue = `configuration-${this.resourceType}`;
    return treeItem;
  }
}
