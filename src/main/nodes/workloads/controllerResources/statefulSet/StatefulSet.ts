import state from "../../../../state";
import { STATEFUL_SET } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";
import { ControllerResourceNode } from "../ControllerResourceNode";

export class StatefulSet extends ControllerResourceNode {
  public type = STATEFUL_SET;
  public resourceType = "statefulSet";
  constructor(
    public parent: BaseNocalhostNode,
    public label: string,
    public name: string,
    public info?: any
  ) {
    super();
    state.setNode(this.getNodeStateId(), this);
  }
}
