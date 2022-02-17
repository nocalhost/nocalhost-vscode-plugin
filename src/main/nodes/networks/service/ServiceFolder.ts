import vscode from "vscode";
import { INhCtlGetResult } from "../../../domain";

import state from "../../../state";
import { KubernetesResourceFolder } from "../../abstract/KubernetesResourceFolder";
import { SERVICE_FOLDER, ID_SPLIT } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { Service } from "./Service";

export class ServiceFolder extends KubernetesResourceFolder {
  public resourceType: string = "Services";

  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
    state.setNode(this.getNodeStateId(), this);
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
    let resource = state.getData(this.getNodeStateId()) as INhCtlGetResult[];
    if (!resource) {
      resource = await this.updateData(true);
    }
    const result: Service[] = resource.map(
      ({ info, vpn }) =>
        new Service(this, info.metadata.name, info.metadata.name, info, vpn)
    );
    return result;
  }
}
