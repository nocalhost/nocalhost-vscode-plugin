import vscode from "vscode";
import { KubernetesResourceFolder } from "../../../abstract/KubernetesResourceFolder";
import { CronJob } from "./CronJob";
import { CRON_JOBS_FOLDER } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";
import { List, Resource } from "../../../types/resourceType";
import state from "../../../../state";
import { kubernetesResourceDevMode } from "../../KubernetesResourceDevMode";

@kubernetesResourceDevMode(CronJob)
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
}
