import state from "../../../state";
import { ConfigurationResourceNode } from "../ConfigurationResourceNode";
import { SECRET } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";

export class Secret extends ConfigurationResourceNode {
  type = SECRET;
  public resourceType = "secret";
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
