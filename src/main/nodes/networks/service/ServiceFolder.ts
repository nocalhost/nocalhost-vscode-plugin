import * as vscode from "vscode";

import * as kubectl from "../../../ctl/kubectl";
import { KubernetesResourceFolder } from "../../abstract/KubernetesResourceFolder";
import { SERVICE_FOLDER, ID_SPLIT } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { List } from "../../types/resourceType";
import { Service } from "./Service";
import refreshSchedule from "../../../schedule/refreshSchedule";

export class ServiceFolder extends KubernetesResourceFolder {
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
    refreshSchedule.getInstance()?.addNode(this);
  }
  public label: string = "Services";
  public type = SERVICE_FOLDER;
  getNodeStateId(): string {
    const parentStateId = this.parent.getNodeStateId();
    return `${parentStateId}${ID_SPLIT}${this.label}`;
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await kubectl.getResourceList(
      this.getKubeConfigPath(),
      "Services"
    );
    const list = JSON.parse(res as string) as List;
    const result: Service[] = list.items.map(
      (item) => new Service(this, item.metadata.name, item.metadata.name, item)
    );
    return result;
  }
}
