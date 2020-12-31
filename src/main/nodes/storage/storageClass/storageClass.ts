import state from "../../../state";
import { KubernetesResourceNode } from "../../abstract/KubernetesResourceNode";
import { STORAGE_CLASS } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";

export class StorageClass extends KubernetesResourceNode {
  type = STORAGE_CLASS;
  public resourceType = "StorageClass";
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
