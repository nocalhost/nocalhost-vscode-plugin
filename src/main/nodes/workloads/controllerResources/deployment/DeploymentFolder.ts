import * as vscode from "vscode";

import * as kubectl from "../../../../ctl/kubectl";
import host from "../../../../host";
import state from "../../../../state";
import { KubernetesResourceFolder } from "../../../abstract/KubernetesResourceFolder";
import { DEPLOYMENT_FOLDER } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";
import { List, ResourceStatus } from "../../../types/resourceType";
import { Deployment } from "./Deployment";

export class DeploymentFolder extends KubernetesResourceFolder {
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  public label: string = "Deployments";
  public type: string = DEPLOYMENT_FOLDER;
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<Deployment[]>> {
    const res = await kubectl.getResourceList(
      this.getKubeConfigPath(),
      "Deployments"
    );
    const list = JSON.parse(res as string) as List;
    const result: Deployment[] = list.items.map((item) => {
      const status = item.status as ResourceStatus;
      const node = new Deployment(
        this,
        item.metadata.name,
        item.metadata.name,
        status.conditions || ((status as unknown) as string),
        item
      );
      state.setNode(node.label, node);
      return node;
    });
    return result;
  }
}
