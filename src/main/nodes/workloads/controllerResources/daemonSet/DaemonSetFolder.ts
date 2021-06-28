import state from "../../../../state";
import { KubernetesResourceFolder } from "../../../abstract/KubernetesResourceFolder";
import { DAEMON_SET_FOLDER } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";
import { kubernetesResourceDevMode } from "../../KubernetesResourceDevMode";
import { DaemonSet } from "./DaemonSet";

@kubernetesResourceDevMode(DaemonSet)
export class DaemonSetFolder extends KubernetesResourceFolder {
  public resourceType: string = "DaemonSets";
  public label: string = "DaemonSets";
  public type: string = DAEMON_SET_FOLDER;
  constructor(public parent: BaseNocalhostNode) {
    super();
    state.setNode(this.getNodeStateId(), this);
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
}
