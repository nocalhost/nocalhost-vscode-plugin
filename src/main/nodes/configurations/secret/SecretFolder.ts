import * as vscode from "vscode";
import { INhCtlGetResult } from "../../../domain";

import state from "../../../state";
import { KubernetesResourceFolder } from "../../abstract/KubernetesResourceFolder";
import { SECRET_FOLDER } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { Secret } from "./Secret";

export class SecretFolder extends KubernetesResourceFolder {
  public resourceType: string = "Secrets";
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
    state.setNode(this.getNodeStateId(), this);
  }
  public label: string = "Secrets";
  public type = SECRET_FOLDER;

  getParent(): BaseNocalhostNode {
    return this.parent;
  }
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    let list = state.getData(this.getNodeStateId()) as INhCtlGetResult[];
    if (!list) {
      list = await this.updateData(true);
    }
    const result: Secret[] = list.map(
      ({ info: item }) =>
        new Secret(this, item.metadata.name, item.metadata.name, item)
    );
    return result;
  }
}
