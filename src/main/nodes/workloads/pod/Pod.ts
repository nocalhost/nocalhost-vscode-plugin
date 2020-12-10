import state from "../../../state";
import { KubernetesResourceNode } from "../../abstract/KubernetesResourceNode";
import { POD } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";

export class Pod extends KubernetesResourceNode {
  public type = POD;
  public resourceType = "pod";
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
