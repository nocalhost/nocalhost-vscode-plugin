import { KubernetesResourceNode } from "../../abstract/KubernetesResourceNode";
import { SERVICE, ID_SPLIT } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";

export class Service extends KubernetesResourceNode {
  type = SERVICE;
  public resourceType = "Service";
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
  }
  getNodeStateId(): string {
    const parentStateId = this.parent.getNodeStateId();
    return `${parentStateId}${ID_SPLIT}${this.name}`;
  }
}
