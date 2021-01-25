import state from "../../../state";
import { ENDPOINT } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { NetworkResourceNode } from "../NetworkResourceNode";

export class Endpoint extends NetworkResourceNode {
  type = ENDPOINT;
  public resourceType = "ep";
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
