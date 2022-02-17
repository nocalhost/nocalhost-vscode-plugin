import vscode from "vscode";
import state from "../../state";
import { NocalhostFolderNode } from "../abstract/NocalhostFolderNode";
import { BaseNocalhostNode } from "../types/nodeType";
import { CrdKind } from "./CrdKind";
import { CrdResource } from "../types/resourceType";

export class CrdGroup extends NocalhostFolderNode {
  public type: string = "CRD_GROUP_FOLDER";
  public label: string = "crd-group";
  public data: [string, CrdResource[]] = ["", []];

  constructor(public parent: BaseNocalhostNode, data: [string, CrdResource[]]) {
    super();
    this.parent = parent;
    this.data = data;
  }

  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    const collapseState =
      state.get(this.getNodeStateId()) ||
      vscode.TreeItemCollapsibleState.Collapsed;
    return new vscode.TreeItem(this.data[0], collapseState);
  }

  getParent(element?: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }

  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<any[]>> {
    const node = this.data[1].map((item) => new CrdKind(this, item));
    return node;
  }
}
