import state from "../../../../state";
import { KubernetesResourceFolder } from "../../../abstract/KubernetesResourceFolder";
import { DEPLOYMENT_FOLDER } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";
import { kubernetesResourceDevMode } from "../../KubernetesResourceDevMode";
import { Deployment } from "./Deployment";

@kubernetesResourceDevMode(Deployment)
export class DeploymentFolder extends KubernetesResourceFolder {
  public resourceType = "Deployments";
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
    state.setNode(this.getNodeStateId(), this);
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  public label: string = "Deployments";
  public type: string = DEPLOYMENT_FOLDER;
}
