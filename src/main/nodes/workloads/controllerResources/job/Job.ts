import { ControllerResourceNode } from "../ControllerResourceNode";
import { JOB } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";

export class Job extends ControllerResourceNode {
  public type = JOB;
  public resourceType = "job";
  constructor(
    public parent: BaseNocalhostNode,
    public label: string,
    public name: string,
    public info?: any
  ) {
    super();
  }
}
