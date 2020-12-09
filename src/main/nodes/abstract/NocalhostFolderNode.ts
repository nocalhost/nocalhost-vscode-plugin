import * as vscode from "vscode";
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
  abstract getParent(element: BaseNocalhostNode): BaseNocalhostNode;
  abstract getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>>;
  abstract getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem>;
}
