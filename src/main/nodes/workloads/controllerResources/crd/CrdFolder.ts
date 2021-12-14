import state from "../../../../state";
import { KubernetesResourceFolder } from "../../../abstract/KubernetesResourceFolder";
import { CRD_FOLDER } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";
import { kubernetesResourceDevMode } from "../../KubernetesResourceDevMode";
import { Crd } from "./crd";

@kubernetesResourceDevMode(Crd)
export class CrdFolder extends KubernetesResourceFolder {
  public resourceType: string = "CustomResources";
  public label: string = "CustomResources";
  public type: string = CRD_FOLDER;
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
    state.setNode(this.getNodeStateId(), this);
  }

  getParent(element?: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
}
