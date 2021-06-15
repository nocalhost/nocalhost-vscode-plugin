import * as vscode from "vscode";
import state from "../../../../state";
import { KubernetesResourceFolder } from "../../../abstract/KubernetesResourceFolder";
import { DAEMON_SET_FOLDER } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";
import { List, Resource } from "../../../types/resourceType";
import { DaemonSet } from "./DaemonSet";

export class DaemonSetFolder extends KubernetesResourceFolder {
  public resourceType: string = "DaemonSets";
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
    let resources = state.getData(this.getNodeStateId()) as Resource[];
    if (!resources) {
      resources = await this.updateData(true);
    }
    const result: DaemonSet[] = resources.map(
      (item) =>
        new DaemonSet(this, item.metadata.name, item.metadata.name, item)
    );

    return this.sortResource<DaemonSet>(result);
  }
}
