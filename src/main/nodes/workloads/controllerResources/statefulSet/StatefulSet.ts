import * as vscode from "vscode";
import state from "../../../../state";
import { DeploymentStatus } from "../../../types/nodeType";
import { STATEFUL_SET } from "../../../nodeContants";
import { IResourceStatus } from "../../../../domain";
import { ControllerResourceNode } from "../ControllerResourceNode";
import logger from "../../../../utils/logger";
import { checkWorkloadConfig } from "../../../../utils/checkConfig";

export class StatefulSet extends ControllerResourceNode {
  public type = STATEFUL_SET;
  public resourceType = "statefulSet";
  private firstRender = true;

  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    try {
      let status = "";
      status = await this.getStatus();
      const [icon, label, mode] = await this.getIconAndLabelByStatus(status);
      treeItem.iconPath = icon;
      treeItem.label = label;
      const check = checkWorkloadConfig(this.nocalhostService);
      treeItem.contextValue = `${treeItem.contextValue}-dev-${
        check ? "info" : "warn"
      }-${status}-${mode}`;
      if (this.firstRender) {
        this.firstRender = false;
      }
    } catch (e) {
      logger.error("StatefulSet getTreeItem");
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
    if (this.svcProfile?.develop_status !== "NONE") {
      return this.svcProfile?.develop_status === "STARTED"
        ? DeploymentStatus.developing
        : DeploymentStatus.running;
    } else if (this.svcProfile?.developing) {
      return DeploymentStatus.developing;
    }

    const resource = this.resource;
    const tmpStatus = resource.status as IResourceStatus;
    if (tmpStatus.replicas === tmpStatus.readyReplicas) {
      status = "running";
    }
    if (!status) {
      status = "unknown";
    }
    return status;
  }
}
