import * as vscode from "vscode";
import { INhCtlGetResult } from "../../../domain";

import state from "../../../state";
import { KubernetesResourceFolder } from "../../abstract/KubernetesResourceFolder";
import { PERSISTENT_VOLUME_CLAIM_FOLDER } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { PersistentVolumeClaim } from "./PersistentVolumeClaim";

export class PersistentVolumeClaimFolder extends KubernetesResourceFolder {
  public resourceType: string = "PersistentVolumeClaim";
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
    state.setNode(this.getNodeStateId(), this);
  }
  public label: string = "Persistent Volume Claims";
  public type = PERSISTENT_VOLUME_CLAIM_FOLDER;

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
    const result: PersistentVolumeClaim[] = list.map(
      ({ info: item }) =>
        new PersistentVolumeClaim(
          this,
          item.metadata.name,
          item.metadata.name,
          item
        )
    );
    return result;
  }
}
