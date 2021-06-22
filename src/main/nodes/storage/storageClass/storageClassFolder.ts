import * as vscode from "vscode";
import state from "../../../state";
import { KubernetesResourceFolder } from "../../abstract/KubernetesResourceFolder";
import { STORAGE_CLASS_FOLDER } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { IK8sResource } from "../../../domain";
import { StorageClass } from "./storageClass";

export class StorageClassFolder extends KubernetesResourceFolder {
  public resourceType: string = "StorageClass";
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
    state.setNode(this.getNodeStateId(), this);
  }
  public label: string = "Storage Classes";
  public type = STORAGE_CLASS_FOLDER;

  getParent(): BaseNocalhostNode {
    return this.parent;
  }
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    let list = state.getData(this.getNodeStateId()) as IK8sResource[];
    if (!list) {
      list = await this.updateData(true);
    }
    const result: StorageClass[] = list.map(
      (item) =>
        new StorageClass(this, item.metadata.name, item.metadata.name, item)
    );
    return result;
  }
}
