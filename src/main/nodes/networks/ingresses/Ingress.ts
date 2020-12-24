import state from "../../../state";
import { KubernetesResourceNode } from "../../abstract/KubernetesResourceNode";
import { INGRESS } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";

export class Ingress extends KubernetesResourceNode {
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
