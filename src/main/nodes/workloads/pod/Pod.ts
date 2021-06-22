import * as vscode from "vscode";

import state from "../../../state";
import { POD } from "../../nodeContants";
import { ControllerResourceNode } from "../controllerResources/ControllerResourceNode";
import { DeploymentStatus } from "../../types/nodeType";
import { IResourceStatus } from "../../../domain";

export class Pod extends ControllerResourceNode {
  public type = POD;
  public resourceType = "pod";

  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    const [status, dev] = await this.getStatusPod();
    const [icon, label] = await this.getIconAndLabelByStatus(status);
    treeItem.iconPath = icon;
    treeItem.label = label;
    const check = await this.checkConfig();
    treeItem.contextValue = `${treeItem.contextValue}-${dev ? "dev-" : ""}${
      check ? "info" : "warn"
    }-${status}`;

    return treeItem;
  }
  public async getStatusPod(refresh = false) {
    const appNode = this.getAppNode();
    let status = state.getAppState(
      appNode.name,
      `${this.getNodeStateId()}_status`
    );

    if (refresh) {
      await this.refreshSvcProfile();
    }
    const resource = this.resource;
    if (this.svcProfile && this.svcProfile.developing) {
      return [
        DeploymentStatus.developing,
        !resource?.metadata?.ownerReferences,
      ];
    }
    const tmpStatus = resource.status as IResourceStatus;
    if (tmpStatus.phase === "Running") {
      status = "running";
    }
    if (!status) {
      status = "unknown";
    }
    return [status, !resource?.metadata?.ownerReferences];
  }
}
