import * as vscode from "vscode";
import state from "../../../../state";
import { CRON_JOB } from "../../../nodeContants";
import { ControllerResourceNode } from "../ControllerResourceNode";
import { DeploymentStatus } from "../../../types/nodeType";

export class CronJob extends ControllerResourceNode {
  public type = CRON_JOB;
  public resourceType = "cronJob";

  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    let status = "";
    status = await this.getStatus();
    const [icon, label] = await this.getIconAndLabelByStatus(status);
    treeItem.iconPath = icon;
    treeItem.label = label;
    const check = await this.checkConfig();
    treeItem.contextValue = `${treeItem.contextValue}-dev-${
      check ? "info" : "warn"
    }-${status}`;

    return treeItem;
  }

  public async getStatus(refresh = false) {
    const appNode = this.getAppNode();
    let status = state.getAppState(
      appNode.name,
      `${this.getNodeStateId()}_status`
    );
    if (status) {
      return Promise.resolve(status);
    }
    if (refresh) {
      await this.refreshSvcProfile();
    }

    if (this.svcProfile && this.svcProfile.developing) {
      return DeploymentStatus.developing;
    }

    return "running";
  }
}
