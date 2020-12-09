import * as vscode from "vscode";
import state from "../../state";
import { NocalhostFolderNode } from "../abstract/NocalhostFolderNode";
import { NETWORK_FOLDER } from "../nodeContants";
import { BaseNocalhostNode } from "../types/nodeType";
import { ServiceFolder } from "./service/ServiceFolder";

export class NetworkFolderNode extends NocalhostFolderNode {
  public parent: BaseNocalhostNode;
  public label: string = "Networks";
  public type = NETWORK_FOLDER;
  private children = ["Services"];

  constructor(parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<NocalhostFolderNode[]>> {
    return Promise.resolve(
      this.children.map((type) => this.createNetworkNode(type))
    );
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    const collapseState =
      state.get(this.getNodeStateId()) ||
      vscode.TreeItemCollapsibleState.Collapsed;
    let treeItem = new vscode.TreeItem(this.label, collapseState);
    return treeItem;
  }

  createNetworkNode(type: string): NocalhostFolderNode {
    let node;
    switch (type) {
      case "Services":
        node = new ServiceFolder(this);
        break;
      default:
        node = new ServiceFolder(this);
        break;
    }

    return node;
  }
}
