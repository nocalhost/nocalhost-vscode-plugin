import * as vscode from "vscode";
import { KubernetesResourceFolder } from "../../../abstract/KubernetesResourceFolder";
import { CronJob } from "./CronJob";
import { CRON_JOBS_FOLDER } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";
import { List, Resource } from "../../../types/resourceType";
import state from "../../../../state";

export class CronJobFolder extends KubernetesResourceFolder {
  public resourceType: string = "CronJobs";
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
    state.setNode(this.getNodeStateId(), this);
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  public label: string = "CronJobs";
  public type: string = CRON_JOBS_FOLDER;
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    let resources = state.getData(this.getNodeStateId()) as Resource[];
    if (!resources) {
      resources = await this.updateData(true);
    }
    const result: CronJob[] = resources.map(
      (item) => new CronJob(this, item.metadata.name, item.metadata.name, item)
    );

    return this.sortResource<CronJob>(result);
  }
}
