import state from "../../../../state";
import { DAEMON_SET } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";
import { ControllerResourceNode } from "../ControllerResourceNode";

export class DaemonSet extends ControllerResourceNode {
  public type = DAEMON_SET;
  public resourceType = "daemonSet";
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
