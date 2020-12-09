import * as vscode from "vscode";

import * as kubectl from "../../../ctl/kubectl";
import host from "../../../host";
import { KubernetesResourceFolder } from "../../abstract/KubernetesResourceFolder";
import { PODS_FOLDER } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { List } from "../../types/resourceType";
import { Pod } from "./Pod";

export class PodFolder extends KubernetesResourceFolder {
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  public label: string = "Pods";
  public type: string = PODS_FOLDER;
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await kubectl.getResourceList(host, "Pods");
    const list = JSON.parse(res as string) as List;
    const result: Pod[] = list.items.map(
      (item) => new Pod(this, item.metadata.name, item.metadata.name, item)
    );

    return result;
  }
}
