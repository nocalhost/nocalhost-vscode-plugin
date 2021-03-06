import * as vscode from "vscode";

import * as kubectl from "../../../../ctl/kubectl";
import * as nhctl from "../../../../ctl/nhctl";
import { resolveVSCodeUri } from "../../../../utils/fileUtil";
import state from "../../../../state";
import { STATEFUL_SET } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";
import { ControllerResourceNode } from "../ControllerResourceNode";
import * as StatefulSetType from "../../../types/StatefulSet";

export class StatefulSet extends ControllerResourceNode {
  public type = STATEFUL_SET;
  public resourceType = "statefulSet";
  constructor(
    public parent: BaseNocalhostNode,
    public label: string,
    public name: string,
    public info?: any
  ) {
    super();
    state.setNode(this.getNodeStateId(), this);
  }

  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    const portForwardStatus = await this.getPortForwardStatus();
    const status = await this.getStatus();
    if (status === "running") {
      treeItem.iconPath = resolveVSCodeUri("status-running.svg");
      if (portForwardStatus) {
        treeItem.iconPath = resolveVSCodeUri("Normal_Port_Forwarding.svg");
      }
    } else {
      treeItem.iconPath = resolveVSCodeUri("loading.svg");
    }
    return treeItem;
  }

  public async getStatus() {
    const deploy = await kubectl.loadResource(
      this.getKubeConfigPath(),
      this.resourceType,
      this.name,
      "json"
    );
    const statefulSetData = JSON.parse(
      deploy as string
    ) as StatefulSetType.default;
    const status = statefulSetData.status;
    let returnStatus = "unknown";
    if (status && status.replicas === status.readyReplicas) {
      returnStatus = "running";
    }

    return returnStatus;
  }

  public async getPortForwardStatus() {
    const appNode = this.getAppNode();
    const svcProfile = await nhctl.getServiceConfig(
      appNode.getKubeConfigPath(),
      appNode.name,
      this.name,
      this.resourceType
    );
    if (svcProfile && svcProfile.devPortForwardList.length > 0) {
      return true;
    }
    return false;
  }
}
