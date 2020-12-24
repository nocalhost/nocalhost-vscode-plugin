import * as vscode from "vscode";

import * as kubectl from "../../../ctl/kubectl";
import { KubernetesResourceFolder } from "../../abstract/KubernetesResourceFolder";
import { RESOURCE_QUOTA_FOLDER } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { List } from "../../types/resourceType";
import { ResourceQuota } from "./ResourceQuota";

export class ResourceQuotaFolder extends KubernetesResourceFolder {
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
  }
  public label: string = "Resource Quotas";
  public type = RESOURCE_QUOTA_FOLDER;

  getParent(): BaseNocalhostNode {
    return this.parent;
  }
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await kubectl.getResourceList(
      this.getKubeConfigPath(),
      "ResourceQuota"
    );
    const list = JSON.parse(res as string) as List;
    const result: ResourceQuota[] = list.items.map(
      (item) =>
        new ResourceQuota(this, item.metadata.name, item.metadata.name, item)
    );
    return result;
  }
}
