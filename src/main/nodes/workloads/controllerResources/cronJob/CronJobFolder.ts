import * as vscode from "vscode";

import * as kubectl from "../../../../ctl/kubectl";
import { KubernetesResourceFolder } from "../../../abstract/KubernetesResourceFolder";
import { CronJob } from "./CronJob";
import { CRON_JOBS_FOLDER } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";
import { List } from "../../../types/resourceType";

export class CronJobFolder extends KubernetesResourceFolder {
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  public label: string = "CronJobs";
  public type: string = CRON_JOBS_FOLDER;
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await kubectl.getResourceList(
      this.getKubeConfigPath(),
      "CronJobs"
    );
    const list = JSON.parse(res as string) as List;
    const result: CronJob[] = list.items.map(
      (item) => new CronJob(this, item.metadata.name, item.metadata.name, item)
    );

    return result;
  }
}
