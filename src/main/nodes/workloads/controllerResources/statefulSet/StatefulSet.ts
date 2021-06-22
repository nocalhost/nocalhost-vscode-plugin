import * as vscode from "vscode";

import state from "../../../../state";
import { STATEFUL_SET } from "../../../nodeContants";
import { DeploymentStatus } from "../../../types/nodeType";
import { ControllerResourceNode } from "../ControllerResourceNode";
import { IResourceStatus } from "../../../../domain";

export class StatefulSet extends ControllerResourceNode {
  public type = STATEFUL_SET;
  public resourceType = "statefulSet";
  private firstRender = true;

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
    if (this.firstRender) {
      this.firstRender = false;
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
    if (this.svcProfile && this.svcProfile.developing) {
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
