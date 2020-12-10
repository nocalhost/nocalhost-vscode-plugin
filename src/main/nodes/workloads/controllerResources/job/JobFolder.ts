import * as vscode from "vscode";

import * as kubectl from "../../../../ctl/kubectl";
import host from "../../../../host";
import { KubernetesResourceFolder } from "../../../abstract/KubernetesResourceFolder";
import { JOBS_FOLDER } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";
import { List } from "../../../types/resourceType";
import { Job } from "./Job";

export class JobFolder extends KubernetesResourceFolder {
  constructor(public parent: BaseNocalhostNode) {
    super();
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  public label: string = "Jobs";
  public type: string = JOBS_FOLDER;
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await kubectl.getResourceList(this.getKubeConfigPath(), "Jobs");
    const list = JSON.parse(res as string) as List;
    const result: Job[] = list.items.map(
      (item) => new Job(this, item.metadata.name, item.metadata.name, item)
    );

    return result;
  }
}
