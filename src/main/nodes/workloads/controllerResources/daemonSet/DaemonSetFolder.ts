import * as vscode from "vscode";

import * as kubectl from "../../../../ctl/kubectl";
import state from "../../../../state";
import { KubernetesResourceFolder } from "../../../abstract/KubernetesResourceFolder";
import { DAEMON_SET_FOLDER } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";
import { List } from "../../../types/resourceType";
import { DaemonSet } from "./DaemonSet";

export class DaemonSetFolder extends KubernetesResourceFolder {
  public async updateData(isInit?: boolean): Promise<any> {
    const res = await kubectl.getResourceList(
      this.getKubeConfigPath(),
      "DaemonSets"
    );
    const list = JSON.parse(res as string) as List;
    state.setData(this.getNodeStateId(), list, isInit);

    return list;
  }
  public label: string = "DaemonSets";
  public type: string = DAEMON_SET_FOLDER;
  constructor(public parent: BaseNocalhostNode) {
    super();
    state.setNode(this.getNodeStateId(), this);
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    let list = state.getData(this.getNodeStateId()) as List;
    if (!list) {
      list = await this.updateData(true);
    }
    const result: DaemonSet[] = list.items.map(
      (item) =>
        new DaemonSet(this, item.metadata.name, item.metadata.name, item)
    );

    return result;
  }
}
