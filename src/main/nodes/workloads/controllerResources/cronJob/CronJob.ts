import * as vscode from "vscode";
import state from "../../../../state";
import { CRON_JOB } from "../../../nodeContants";
import { ControllerResourceNode } from "../ControllerResourceNode";
import { DeploymentStatus } from "../../../types/nodeType";
import logger from "../../../../utils/logger";

export class CronJob extends ControllerResourceNode {
  public type = CRON_JOB;
  public resourceType = "cronJob";

  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    try {
      let status = "";
      status = await this.getStatus();
      const [icon, label] = await this.getIconAndLabelByStatus(status);
      treeItem.iconPath = icon;
      treeItem.label = label;
      const check = await this.checkConfig();
      treeItem.contextValue = `${treeItem.contextValue}-dev-${
        check ? "info" : "warn"
      }-${status}`;
    } catch (e) {
      logger.error("cronjob getTreeItem");
      logger.error(e);
    }

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

    if (
      this.svcProfile?.develop_status &&
      this.svcProfile?.develop_status !== "NONE"
    ) {
      return this.svcProfile?.develop_status === "STARTING"
        ? DeploymentStatus.developing
        : DeploymentStatus.running;
    }

    return "running";
  }
}
