import state from "../../../state";
import { KubernetesResourceNode } from "../../abstract/KubernetesResourceNode";
import { HPA } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";

export class HPANode extends KubernetesResourceNode {
  type = HPA;
  public resourceType = "hpa";
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
