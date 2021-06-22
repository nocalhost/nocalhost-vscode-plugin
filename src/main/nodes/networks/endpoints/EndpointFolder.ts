import * as vscode from "vscode";

import state from "../../../state";
import { KubernetesResourceFolder } from "../../abstract/KubernetesResourceFolder";
import { ENDPOINT_FOLDER } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { IK8sResource } from "../../../domain";
import { Endpoint } from "./Endpoint";

export class EndpointFolder extends KubernetesResourceFolder {
  public resourceType: string = "Endpoints";
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
    state.setNode(this.getNodeStateId(), this);
  }
  public label: string = "Endpoints";
  public type = ENDPOINT_FOLDER;

  getParent(): BaseNocalhostNode {
    return this.parent;
  }
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    let list = state.getData(this.getNodeStateId()) as IK8sResource[];
    if (!list) {
      list = await this.updateData(true);
    }
    const result: Endpoint[] = list.map(
      (item) => new Endpoint(this, item.metadata.name, item.metadata.name, item)
    );
    return result;
  }
}
