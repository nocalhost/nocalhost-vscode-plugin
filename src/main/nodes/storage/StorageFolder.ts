import * as vscode from "vscode";
import state from "../../state";
import { NocalhostFolderNode } from "../abstract/NocalhostFolderNode";
import { CONFIGURATION_FOLDER } from "../nodeContants";
import { BaseNocalhostNode } from "../types/nodeType";
import { PersistentVolumeFolder } from "./persistentVolume/PersistentVolumeFolder";
import { PersistentVolumeClaimFolder } from "./persistentVolumeClaim/PersistentVolumeClaimFolder";
import { StorageClassFolder } from "./storageClass/storageClassFolder";

export class StorageFolder extends NocalhostFolderNode {
  public parent: BaseNocalhostNode;
  public label: string = "Storage";
  public type = CONFIGURATION_FOLDER;
  private children = ["pv", "pvc", "storageClass"];

  constructor(parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
  }
  getParent(): BaseNocalhostNode {
    return this.parent;
  }
  getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    return Promise.resolve(this.children.map((type) => this.createChild(type)));
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    const collapseState =
      state.get(this.getNodeStateId()) ||
      vscode.TreeItemCollapsibleState.Collapsed;
    let treeItem = new vscode.TreeItem(this.label, collapseState);
    return treeItem;
  }

  createChild(type: string): BaseNocalhostNode {
    let node: BaseNocalhostNode;
    switch (type) {
      case "pv":
        node = new PersistentVolumeFolder(this);
        break;
      case "pvc":
        node = new PersistentVolumeClaimFolder(this);
        break;
      case "storageClass":
        node = new StorageClassFolder(this);
        break;
      default:
        throw new Error("not implement the resource");
    }

    return node;
  }
}
