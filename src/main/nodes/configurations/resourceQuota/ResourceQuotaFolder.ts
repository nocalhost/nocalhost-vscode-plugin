import vscode from "vscode";
import { INhCtlGetResult } from "../../../domain";

import state from "../../../state";
import { KubernetesResourceFolder } from "../../abstract/KubernetesResourceFolder";
import { RESOURCE_QUOTA_FOLDER } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { ResourceQuota } from "./ResourceQuota";

export class ResourceQuotaFolder extends KubernetesResourceFolder {
  public resourceType: string = "ResourceQuota";

  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
    state.setNode(this.getNodeStateId(), this);
  }
  public label: string = "Resource Quotas";
  public type = RESOURCE_QUOTA_FOLDER;

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
    const result: ResourceQuota[] = list.map(
      ({ info: item }) =>
        new ResourceQuota(this, item.metadata.name, item.metadata.name, item)
    );
    return result;
  }
}
