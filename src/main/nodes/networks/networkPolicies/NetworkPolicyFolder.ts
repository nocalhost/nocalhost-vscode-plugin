import * as vscode from "vscode";

import * as kubectl from "../../../ctl/kubectl";
import { KubernetesResourceFolder } from "../../abstract/KubernetesResourceFolder";
import { NETWORK_POLICIES_FOLDER } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { List } from "../../types/resourceType";
import { NetworkPolicy } from "./NetworkPolicy";

export class NetworkPolicyFolder extends KubernetesResourceFolder {
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
  }
  public label: string = "Network Policies";
  public type = NETWORK_POLICIES_FOLDER;

  getParent(): BaseNocalhostNode {
    return this.parent;
  }
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await kubectl.getResourceList(
      this.getKubeConfigPath(),
      "NetworkPolicy"
    );
    const list = JSON.parse(res as string) as List;
    const result: NetworkPolicy[] = list.items.map(
      (item) =>
        new NetworkPolicy(this, item.metadata.name, item.metadata.name, item)
    );
    return result;
  }
}
