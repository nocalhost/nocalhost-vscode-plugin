import state from "../../../state";
import { KubernetesResourceNode } from "../../abstract/KubernetesResourceNode";
import { NETWORK_POLICIES } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";

export class NetworkPolicy extends KubernetesResourceNode {
  type = NETWORK_POLICIES;
  public resourceType = "NetworkPolicy";
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
