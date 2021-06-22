import * as vscode from "vscode";
import state from "../../../../state";
import host from "../../../../host";
import * as nhctl from "../../../../ctl/nhctl";
import { DAEMON_SET } from "../../../nodeContants";
import { IResourceStatus } from "../../../../domain";
import { DeploymentStatus, BaseNocalhostNode } from "../../../types/nodeType";
import { ControllerResourceNode } from "../ControllerResourceNode";
export class DaemonSet extends ControllerResourceNode {
  public type = DAEMON_SET;
  public resourceType = "daemonSet";

  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    let status = "";
    try {
      status = await this.getStatus();
      const [icon, label] = await this.getIconAndLabelByStatus(status);
      treeItem.iconPath = icon;
      treeItem.label = label;
      const check = await this.checkConfig();
      treeItem.contextValue = `${treeItem.contextValue}-dev-${
        check ? "info" : "warn"
      }-${status}`;
    } catch (e) {
      host.log(e, true);
    }

    return treeItem;
  }

  public async getStatus(refresh = false) {
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

    const tmpStatus = this.resource.status as IResourceStatus;
    if (tmpStatus.numberReady > 0) {
      status = "running";
    }
    if (!status) {
      status = "unknown";
    }

    return status;
  }
}
