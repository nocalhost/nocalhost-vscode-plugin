import * as vscode from "vscode";

import * as kubectl from "../../../../ctl/kubectl";
import { KubernetesResourceFolder } from "../../../abstract/KubernetesResourceFolder";
import { DAEMON_SET_FOLDER } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";
import { List } from "../../../types/resourceType";
import { DaemonSet } from "./DaemonSet";

export class DaemonSetFolder extends KubernetesResourceFolder {
  public label: string = "DaemonSets";
  public type: string = DAEMON_SET_FOLDER;
  constructor(public parent: BaseNocalhostNode) {
    super();
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await kubectl.getResourceList(
      this.getKubeConfigPath(),
      "DaemonSets"
    );
    const list = JSON.parse(res as string) as List;
    const result: DaemonSet[] = list.items.map(
      (item) =>
        new DaemonSet(this, item.metadata.name, item.metadata.name, item)
    );

    return result;
  }
}
