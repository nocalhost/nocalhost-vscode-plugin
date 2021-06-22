import * as vscode from "vscode";

import state from "../../../state";
import { KubernetesResourceFolder } from "../../abstract/KubernetesResourceFolder";
import { HPA_FOLDER } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";

import { IK8sResource } from "../../../domain";

import { HPANode } from "./Hpa";

export class HPAFolder extends KubernetesResourceFolder {
  public resourceType: string = "hpa";
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
    state.setNode(this.getNodeStateId(), this);
  }
  public label: string = "HPA";
  public type = HPA_FOLDER;

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
    const result: HPANode[] = list.map(
      (item) => new HPANode(this, item.metadata.name, item.metadata.name, item)
    );
    return result;
  }
}
