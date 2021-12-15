import * as vscode from "vscode";
import { INhCtlGetResult } from "../../../domain";

import state from "../../../state";
import { KubernetesResourceFolder } from "../../abstract/KubernetesResourceFolder";
import { CONFIG_MAP_FOLDER } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { PersistentVolume } from "./PersistentVolume";

export class PersistentVolumeFolder extends KubernetesResourceFolder {
  public resourceType: string = "PersistentVolume";
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
    state.setNode(this.getNodeStateId(), this);
  }
  public label: string = "Persistent Volumes";
  public type = CONFIG_MAP_FOLDER;

  getParent(): BaseNocalhostNode {
    return this.parent;
  }
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    let list = state.getData(this.getNodeStateId()) as INhCtlGetResult[];
    if (!list) {
      list = await this.updateData(true);
    }
    const result: PersistentVolume[] = list.map(
      ({ info: item }) =>
        new PersistentVolume(this, item.metadata.name, item.metadata.name, item)
    );
    return result;
  }
}
