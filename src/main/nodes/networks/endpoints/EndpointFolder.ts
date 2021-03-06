import * as vscode from "vscode";

import * as kubectl from "../../../ctl/kubectl";
import state from "../../../state";
import { KubernetesResourceFolder } from "../../abstract/KubernetesResourceFolder";
import { ENDPOINT_FOLDER } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { List } from "../../types/resourceType";
import { Endpoint } from "./Endpoint";

export class EndpointFolder extends KubernetesResourceFolder {
  public async updateData(isInit?: boolean): Promise<any> {
    const res = await kubectl.getResourceList(
      this.getKubeConfigPath(),
      "Endpoints"
    );
    const list = JSON.parse(res as string) as List;
    state.setData(this.getNodeStateId(), list);

    return list;
  }
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
    let list = state.getData(this.getNodeStateId()) as List;
    if (!list) {
      list = await this.updateData(true);
    }
    const result: Endpoint[] = list.items.map(
      (item) => new Endpoint(this, item.metadata.name, item.metadata.name, item)
    );
    return result;
  }
}
