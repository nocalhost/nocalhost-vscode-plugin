import * as vscode from "vscode";
import { ControllerResourceNode } from "../ControllerResourceNode";
import { JOB } from "../../../nodeContants";
import logger from "../../../../utils/logger";
import * as nhctl from "../../../../ctl/nhctl";
import state from "../../../../state";
import { DeploymentStatus } from "../../../types/nodeType";
import { Status, Resource, ResourceStatus } from "../../../types/resourceType";

export class Job extends ControllerResourceNode {
  public type = JOB;
  public resourceType = "job";
  private firstRender = true;

  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    try {
      let status = await this.getStatus();

      treeItem.tooltip = `${this.label}(${status})`;

      if (status === "complete") {
        status = "running";
      }

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
  async getStatus(refresh = false) {
    const appNode = this.getAppNode();
    let status = state.getAppState(
      appNode.name,
      `${this.getNodeStateId()}_status`
    );
    if (refresh) {
      await this.refreshSvcProfile();
    }
    if (status) {
      return Promise.resolve(status);
    }

    if (this.svcProfile && this.svcProfile.developing) {
      return DeploymentStatus.developing;
    }

    await this.refreshSvcProfile();
    if (this.svcProfile && this.svcProfile.developing) {
      return DeploymentStatus.developing;
    }

    const deploy = await nhctl.getLoadResource({
      kubeConfigPath: this.getKubeConfigPath(),
      kind: this.resourceType,
      name: this.name,
      namespace: appNode.namespace,
      outputType: "json",
    });
    const res = JSON.parse(deploy as string) as Resource;

    status = res.status as ResourceStatus;
    this.conditionsStatus =
      status.conditions || ((status as unknown) as string);

    if (Array.isArray(this.conditionsStatus)) {
      if (
        this.conditionsStatus.findIndex(({ type }) => type === "Complete") > -1
      ) {
        return "complete";
      } else if (
        this.conditionsStatus.findIndex(({ type }) => type === "Failed") > -1
      ) {
        return "failed";
      }
    }
    return "unknown";
  }
}
