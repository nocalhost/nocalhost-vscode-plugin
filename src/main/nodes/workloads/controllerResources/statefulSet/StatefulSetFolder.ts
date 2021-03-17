import * as vscode from "vscode";

import * as kubectl from "../../../../ctl/kubectl";
import state from "../../../../state";
import { KubernetesResourceFolder } from "../../../abstract/KubernetesResourceFolder";
import { STATEFUL_SET_FOLDER } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";
import { List, Resource } from "../../../types/resourceType";
import { StatefulSet } from "./StatefulSet";

export class StatefulSetFolder extends KubernetesResourceFolder {
  public resourceType: string = "StatefulSets";
  public label: string = "StatefulSets";
  public type: string = STATEFUL_SET_FOLDER;

  constructor(public parent: BaseNocalhostNode) {
    super();
    state.setNode(this.getNodeStateId(), this);
  }

  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    let resources = state.getData(this.getNodeStateId()) as Resource[];
    if (!resources) {
      resources = await this.updateData(true);
    }
    const result: StatefulSet[] = resources.map(
      (item) =>
        new StatefulSet(this, item.metadata.name, item.metadata.name, item)
    );

    return result;
  }
}
