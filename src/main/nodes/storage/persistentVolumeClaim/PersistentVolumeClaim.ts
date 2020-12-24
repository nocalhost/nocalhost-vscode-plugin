import state from "../../../state";
import { KubernetesResourceNode } from "../../abstract/KubernetesResourceNode";
import { PERSISTENT_VOLUME_CLAIM } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";

export class PersistentVolumeClaim extends KubernetesResourceNode {
  type = PERSISTENT_VOLUME_CLAIM;
  public resourceType = "PersistentVolumeClaim";
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
