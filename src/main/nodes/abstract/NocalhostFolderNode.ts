import * as vscode from "vscode";
import { AppNode } from "../AppNode";
import { ID_SPLIT } from "../nodeContants";

import { BaseNocalhostNode } from "../types/nodeType";

export abstract class NocalhostFolderNode implements BaseNocalhostNode {
  abstract parent: BaseNocalhostNode;
  abstract label: string;
  abstract type: string;

  getNodeStateId(): string {
    const parentStateId = this.parent.getNodeStateId();
    return `${parentStateId}${ID_SPLIT}${this.label}`;
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

  abstract getParent(element: BaseNocalhostNode): BaseNocalhostNode;
  abstract getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>>;
  abstract getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem>;
}
