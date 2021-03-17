import * as vscode from "vscode";

import * as kubectl from "../../../ctl/kubectl";
import state from "../../../state";
import { KubernetesResourceFolder } from "../../abstract/KubernetesResourceFolder";
import { POD_DISRUPTION_BUDGET } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { List, Resource } from "../../types/resourceType";
import { PodDisruptionBudget } from "./PodDisruptionBudget";

export class PodDisruptionBudgetFolder extends KubernetesResourceFolder {
  public resourceType: string = "PodDisruptionBudget";
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
    state.setNode(this.getNodeStateId(), this);
  }
  public label: string = "Pod Disruption Budgets";
  public type = POD_DISRUPTION_BUDGET;

  getParent(): BaseNocalhostNode {
    return this.parent;
  }
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    let list = state.getData(this.getNodeStateId()) as Resource[];
    if (!list) {
      list = await this.updateData(true);
    }
    const result: PodDisruptionBudget[] = list.map(
      (item) =>
        new PodDisruptionBudget(
          this,
          item.metadata.name,
          item.metadata.name,
          item
        )
    );
    return result;
  }
}
