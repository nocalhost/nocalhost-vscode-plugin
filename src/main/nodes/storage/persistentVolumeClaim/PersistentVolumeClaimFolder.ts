import * as vscode from "vscode";

import * as kubectl from "../../../ctl/kubectl";
import { KubernetesResourceFolder } from "../../abstract/KubernetesResourceFolder";
import { PERSISTENT_VOLUME_CLAIM_FOLDER } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { List } from "../../types/resourceType";
import { PersistentVolumeClaim } from "./PersistentVolumeClaim";

export class PersistentVolumeClaimFolder extends KubernetesResourceFolder {
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
  }
  public label: string = "Persistent Volume Claims";
  public type = PERSISTENT_VOLUME_CLAIM_FOLDER;

  getParent(): BaseNocalhostNode {
    return this.parent;
  }
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await kubectl.getResourceList(
      this.getKubeConfigPath(),
      "PersistentVolumeClaim"
    );
    const list = JSON.parse(res as string) as List;
    const result: PersistentVolumeClaim[] = list.items.map(
      (item) =>
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
