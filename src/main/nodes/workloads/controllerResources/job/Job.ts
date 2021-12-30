import * as vscode from "vscode";
import { ControllerResourceNode } from "../ControllerResourceNode";
import { JOB } from "../../../nodeContants";
import logger from "../../../../utils/logger";
import state from "../../../../state";
import { DeploymentStatus } from "../../../types/nodeType";
import { IResourceStatus } from "../../../../domain";

export class Job extends ControllerResourceNode {
  public type = JOB;
  public resourceType = "job";
  private firstRender = true;

  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    try {
      let status = await this.getStatus();

      treeItem.tooltip = `${this.label}(${status})`;

      const [icon, label] = await this.getIconAndLabelByStatus(status);
      treeItem.iconPath = icon;
      treeItem.label = label;
      const check = await this.checkConfig();
      treeItem.contextValue = `${treeItem.contextValue}-dev-${
        check ? "info" : "warn"
      }-${status}`;
      if (this.firstRender) {
        this.firstRender = false;
      }
    } catch (e) {
      logger.error("job getTreeItem");
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
      return this.svcProfile.develop_status === "STARTED"
        ? DeploymentStatus.developing
        : DeploymentStatus.develop_starting;
    }

    const resourceStatus = this.resource.status as IResourceStatus;
    const conditionsStatus = resourceStatus.conditions;

    if (Array.isArray(conditionsStatus)) {
      if (conditionsStatus.findIndex(({ type }) => type === "Complete") > -1) {
        return "complete";
      } else if (
        conditionsStatus.findIndex(({ type }) => type === "Failed") > -1
      ) {
        return "failed";
      }
    }

    return "unknown";
  }
}
