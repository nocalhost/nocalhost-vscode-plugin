import state from "../../../../state";
import { CRON_JOB } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";
import { ControllerResourceNode } from "../ControllerResourceNode";

export class CronJob extends ControllerResourceNode {
  public type = CRON_JOB;
  public resourceType = "cronJob";
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
