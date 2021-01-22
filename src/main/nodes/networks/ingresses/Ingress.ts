import state from "../../../state";
import { INGRESS } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { NetworkResourceNode } from "../NetworkResourceNode";

export class Ingress extends NetworkResourceNode {
  type = INGRESS;
  public resourceType = "Ingress";
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
