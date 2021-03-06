import * as vscode from "vscode";

import * as kubectl from "../../../ctl/kubectl";
import state from "../../../state";
import { KubernetesResourceFolder } from "../../abstract/KubernetesResourceFolder";
import { HPA_FOLDER } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { List } from "../../types/resourceType";
import { HPANode } from "./Hpa";

export class HPAFolder extends KubernetesResourceFolder {
  public async updateData(isInit?: boolean): Promise<any> {
    const res = await kubectl.getResourceList(this.getKubeConfigPath(), "hpa");
    const list = JSON.parse(res as string) as List;

    state.setData(this.getNodeStateId(), list, isInit);
    return list;
  }
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
    let list = state.getData(this.getNodeStateId()) as List;
    if (!list) {
      list = await this.updateData(true);
    }
    const result: HPANode[] = list.items.map(
      (item) => new HPANode(this, item.metadata.name, item.metadata.name, item)
    );
    return result;
  }
}
