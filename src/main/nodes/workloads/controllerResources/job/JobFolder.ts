import state from "../../../../state";
import { KubernetesResourceFolder } from "../../../abstract/KubernetesResourceFolder";
import { JOBS_FOLDER } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";
import { Job } from "./Job";
import { kubernetesResourceDevMode } from "../../KubernetesResourceDevMode";

@kubernetesResourceDevMode(Job)
export class JobFolder extends KubernetesResourceFolder {
  public resourceType: string = "Jobs";

  constructor(public parent: BaseNocalhostNode) {
    super();
    state.setNode(this.getNodeStateId(), this);
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  public label: string = "Jobs";
  public type: string = JOBS_FOLDER;
}
