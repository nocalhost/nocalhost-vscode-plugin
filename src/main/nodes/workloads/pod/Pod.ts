import * as vscode from "vscode";

import state from "../../../state";
import * as nhctl from "../../../ctl/nhctl";

import { KubernetesResourceNode } from "../../abstract/KubernetesResourceNode";
import { POD } from "../../nodeContants";
import { ControllerResourceNode } from "../controllerResources/ControllerResourceNode";
import { BaseNocalhostNode } from "../../types/nodeType";
import { DeploymentStatus } from "../../types/nodeType";
import { Resource, ResourceStatus, Status } from "../../types/resourceType";

export class Pod extends ControllerResourceNode {
  public type = POD;
  public resourceType = "pod";

  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    const [status, dev] = await this.getStatus();
    const [icon, label] = await this.getIconAndLabelByStatus(status);
    treeItem.iconPath = icon;
    treeItem.label = label;
    const check = await this.checkConfig();
    treeItem.contextValue = `${treeItem.contextValue}-${dev ? "dev-" : ""}${
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

    if (refresh) {
      await this.refreshSvcProfile();
    }
    if (status) {
      return Promise.resolve(status);
    }
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
    if (tmpStatus.phase === "Running") {
      status = "running";
    }
    if (!status) {
      status = "unknown";
    }
    return [status, !res?.metadata?.ownerReferences];
  }
}
