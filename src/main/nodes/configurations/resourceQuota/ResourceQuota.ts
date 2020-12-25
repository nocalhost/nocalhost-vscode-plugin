import state from "../../../state";
import { KubernetesResourceNode } from "../../abstract/KubernetesResourceNode";
import { RESOURCE_QUOTA } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";

export class ResourceQuota extends KubernetesResourceNode {
  type = RESOURCE_QUOTA;
  public resourceType = "ResourceQuota";
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
