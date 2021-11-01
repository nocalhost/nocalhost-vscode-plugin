import state from "../../../state";
import { KubernetesResourceFolder } from "../../abstract/KubernetesResourceFolder";
import { PODS_FOLDER } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { Pod } from "./Pod";
import { kubernetesResourceDevMode } from "../KubernetesResourceDevMode";

@kubernetesResourceDevMode(Pod)
export class PodFolder extends KubernetesResourceFolder {
  public resourceType: string = "Pods";

  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
    state.setNode(this.getNodeStateId(), this);
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  public label: string = "Pods";
  public type: string = PODS_FOLDER;
}
