import * as vscode from "vscode";

import state from "../../../state";
import { IResourceStatus } from "../../../domain";

import { POD } from "../../nodeContants";
import { ControllerResourceNode } from "../controllerResources/ControllerResourceNode";
import { DeploymentStatus } from "../../types/nodeType";
import logger from "../../../utils/logger";

export class Pod extends ControllerResourceNode {
  public type = POD;
  public resourceType = "pod";

  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    try {
      const [status, dev] = await this.getStatusPod();
      const [icon, label, mode] = await this.getIconAndLabelByStatus(status);
      treeItem.iconPath = icon;
      treeItem.label = label;
      const check = await this.checkConfig();
      treeItem.contextValue = `${treeItem.contextValue}-${dev ? "dev-" : ""}${
        check ? "info" : "warn"
      }-${status}-${mode}`;
    } catch (e) {
      logger.error("pod getTreeItem");
      logger.error(e);
    }

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
    if (
      this.svcProfile &&
      this.svcProfile.develop_status &&
      this.svcProfile.develop_status !== "NONE"
    ) {
      return [
        this.svcProfile.develop_status === "STARTED"
          ? DeploymentStatus.developing
          : DeploymentStatus.running,
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
