import * as vscode from "vscode";

import state from "../../../state";
import { KubernetesResourceFolder } from "../../abstract/KubernetesResourceFolder";
import { INGRESS_FOLDER } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { List, Resource } from "../../types/resourceType";
import { Ingress } from "./Ingress";

export class IngressFolder extends KubernetesResourceFolder {
  public resourceType: string = "ingress";
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
    state.setNode(this.getNodeStateId(), this);
  }
  public label: string = "Ingresses";
  public type = INGRESS_FOLDER;

  getParent(): BaseNocalhostNode {
    return this.parent;
  }
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    let list = state.getData(this.getNodeStateId()) as Resource[];
    if (!list) {
      list = await this.updateData(true);
    }
    const result: Ingress[] = list.map(
      (item) => new Ingress(this, item.metadata.name, item.metadata.name, item)
    );
    return result;
  }
}
