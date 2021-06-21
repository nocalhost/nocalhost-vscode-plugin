import * as vscode from "vscode";
import { ControllerResourceNode } from "../ControllerResourceNode";
import { JOB } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";
import state from "../../../../state";
import * as nhctl from "../../../../ctl/nhctl";
import { DeploymentStatus } from "../../../types/nodeType";
import { Resource, ResourceStatus, Status } from "../../../types/resourceType";

export class Job extends ControllerResourceNode {
  public type = JOB;
  public resourceType = "job";
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
    if (refresh) {
      await this.refreshSvcProfile();
    }
    if (status) {
      return Promise.resolve(status);
    }
    if (this.firstRender) {
      if (this.svcProfile && this.svcProfile.developing) {
        return DeploymentStatus.developing;
      }
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
    const tmpStatus = res.status as ResourceStatus;
    if (tmpStatus.replicas === tmpStatus.readyReplicas) {
      status = "running";
    }
    if (!status) {
      status = "unknown";
    }
    return status;
  }
}
