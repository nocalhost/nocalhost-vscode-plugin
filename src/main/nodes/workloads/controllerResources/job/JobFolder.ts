import * as vscode from "vscode";
import { orderBy } from "lodash";

import * as kubectl from "../../../../ctl/kubectl";
import host from "../../../../host";
import state from "../../../../state";
import { KubernetesResourceFolder } from "../../../abstract/KubernetesResourceFolder";
import { JOBS_FOLDER } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";
import { List, Resource } from "../../../types/resourceType";
import { Job } from "./Job";

export class JobFolder extends KubernetesResourceFolder {
  public resourceType: string = "Jobs";

  constructor(public parent: BaseNocalhostNode) {
    super();
    state.setNode(this.getNodeStateId(), this);
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  public label: string = "Jobs";
  public type: string = JOBS_FOLDER;
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    let resources = state.getData(this.getNodeStateId()) as Resource[];
    if (!resources) {
      resources = await this.updateData(true);
    }
    const result: Job[] = resources.map(
      (item) => new Job(this, item.metadata.name, item.metadata.name, item)
    );

    return this.sortResource<Job>(result);
  }
}
