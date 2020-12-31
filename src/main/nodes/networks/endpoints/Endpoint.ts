import state from "../../../state";
import { KubernetesResourceNode } from "../../abstract/KubernetesResourceNode";
import { ENDPOINT } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";

export class Endpoint extends KubernetesResourceNode {
  type = ENDPOINT;
  public resourceType = "Endpoints";
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
