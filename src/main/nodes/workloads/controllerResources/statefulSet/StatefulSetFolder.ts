import * as vscode from "vscode";

import * as kubectl from "../../../../ctl/kubectl";
import host from "../../../../host";
import { KubernetesResourceFolder } from "../../../abstract/KubernetesResourceFolder";
import { STATEFUL_SET_FOLDER } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";
import { List } from "../../../types/resourceType";
import { StatefulSet } from "./StatefulSet";

export class StatefulSetFolder extends KubernetesResourceFolder {
  public label: string = "StatefulSets";
  public type: string = STATEFUL_SET_FOLDER;

  constructor(public parent: BaseNocalhostNode) {
    super();
  }

  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await kubectl.getResourceList(host, "StatefulSets");
    const list = JSON.parse(res as string) as List;
    const result: StatefulSet[] = list.items.map(
      (item) =>
        new StatefulSet(this, item.metadata.name, item.metadata.name, item)
    );

    return result;
  }
}
