import * as vscode from "vscode";

import * as kubectl from "../../../ctl/kubectl";
import { KubernetesResourceFolder } from "../../abstract/KubernetesResourceFolder";
import { ENDPOINT_FOLDER } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { List } from "../../types/resourceType";
import { Endpoint } from "./Endpoint";

export class EndpointFolder extends KubernetesResourceFolder {
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
  }
  public label: string = "Endpoints";
  public type = ENDPOINT_FOLDER;

  getParent(): BaseNocalhostNode {
    return this.parent;
  }
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await kubectl.getResourceList(
      this.getKubeConfigPath(),
      "Endpoints"
    );
    const list = JSON.parse(res as string) as List;
    const result: Endpoint[] = list.items.map(
      (item) => new Endpoint(this, item.metadata.name, item.metadata.name, item)
    );
    return result;
  }
}
