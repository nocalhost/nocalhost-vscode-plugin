import state from "../../../state";
import { KubernetesResourceNode } from "../../abstract/KubernetesResourceNode";
import { CONFIG_MAP, POD_DISRUPTION_BUDGET } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";

export class PodDisruptionBudget extends KubernetesResourceNode {
  type = POD_DISRUPTION_BUDGET;
  public resourceType = "PodDisruptionBudget";
  constructor(
    public parent: BaseNocalhostNode,
    public label: string,
    public name: string,
    public info?: any
  ) {
    super();
    this.parent = parent;
    this.label = label;
    this.info = info;
    this.name = name;
    state.setNode(this.getNodeStateId(), this);
  }
}
