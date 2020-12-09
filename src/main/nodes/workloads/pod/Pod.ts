import { KubernetesResourceNode } from "../../abstract/KubernetesResourceNode";
import { POD, ID_SPLIT } from "../../nodeContants";
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
  }
  getNodeStateId(): string {
    const parentStateId = this.parent.getNodeStateId();
    return `${parentStateId}${ID_SPLIT}${this.name}`;
  }
}
