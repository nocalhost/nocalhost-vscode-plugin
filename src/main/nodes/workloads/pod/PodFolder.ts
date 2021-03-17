import * as vscode from "vscode";

import * as kubectl from "../../../ctl/kubectl";
import host from "../../../host";
import state from "../../../state";
import { KubernetesResourceFolder } from "../../abstract/KubernetesResourceFolder";
import { PODS_FOLDER } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { List, Resource } from "../../types/resourceType";
import { Pod } from "./Pod";

export class PodFolder extends KubernetesResourceFolder {
  public resourceType: string = "Pods";

  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
    state.setNode(this.getNodeStateId(), this);
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  public label: string = "Pods";
  public type: string = PODS_FOLDER;
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    let resources = state.getData(this.getNodeStateId()) as Resource[];
    if (!resources) {
      resources = await this.updateData(true);
    }
    const result: Pod[] = resources.map(
      (item) => new Pod(this, item.metadata.name, item.metadata.name, item)
    );

    return result;
  }
}
