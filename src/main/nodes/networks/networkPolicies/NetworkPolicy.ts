import state from "../../../state";
import { NETWORK_POLICIES } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { NetworkResourceNode } from "../NetworkResourceNode";

export class NetworkPolicy extends NetworkResourceNode {
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
