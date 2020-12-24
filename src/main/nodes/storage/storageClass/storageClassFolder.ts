import * as vscode from "vscode";

import * as kubectl from "../../../ctl/kubectl";
import { KubernetesResourceFolder } from "../../abstract/KubernetesResourceFolder";
import { STORAGE_CLASS_FOLDER } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { List } from "../../types/resourceType";
import { StorageClass } from "./storageClass";

export class StorageClassFolder extends KubernetesResourceFolder {
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
  }
  public label: string = "Storage Classes";
  public type = STORAGE_CLASS_FOLDER;

  getParent(): BaseNocalhostNode {
    return this.parent;
  }
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await kubectl.getResourceList(
      this.getKubeConfigPath(),
      "StorageClass"
    );
    const list = JSON.parse(res as string) as List;
    const result: StorageClass[] = list.items.map(
      (item) =>
        new StorageClass(this, item.metadata.name, item.metadata.name, item)
    );
    return result;
  }
}
