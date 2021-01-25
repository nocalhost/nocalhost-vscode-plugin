import state from "../../../state";
import { ConfigurationResourceNode } from "../ConfigurationResourceNode";
import { POD_DISRUPTION_BUDGET } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";

export class PodDisruptionBudget extends ConfigurationResourceNode {
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
