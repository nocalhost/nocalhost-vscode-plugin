import * as vscode from "vscode";

import * as kubectl from "../../../../ctl/kubectl";
import * as nhctl from "../../../../ctl/nhctl";
import { resolveVSCodeUri } from "../../../../utils/fileUtil";
import state from "../../../../state";
import { STATEFUL_SET } from "../../../nodeContants";
import {
  BaseNocalhostNode,
  DeploymentStatus,
  SvcProfile,
} from "../../../types/nodeType";
import { ControllerResourceNode } from "../ControllerResourceNode";
import * as StatefulSetType from "../../../types/StatefulSet";
import host from "../../../../host";
import { IS_LOCAL } from "../../../../constants";
import { Resource, ResourceStatus, Status } from "../../../types/resourceType";
import { NocalhostServiceConfig } from "../../../../service/configService";

export class StatefulSet extends ControllerResourceNode {
  public type = STATEFUL_SET;
  public resourceType = "statefulSet";
  private firstRender = true;

  constructor(
    public parent: BaseNocalhostNode,
    public label: string,
    public name: string,
    private conditionsStatus: Array<Status> | string,
    private svcProfile: SvcProfile | undefined | null,
    private nocalhostService: NocalhostServiceConfig | undefined | null,
    public info?: any
  ) {
    super();
    state.setNode(this.getNodeStateId(), this);
  }

  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    let status = "";
    status = await this.getStatus();
    const portForwardStatus = await this.getPortForwardStatus();
    switch (status) {
      case "running":
        treeItem.iconPath = resolveVSCodeUri("status-running.svg");
        if (portForwardStatus) {
          treeItem.iconPath = resolveVSCodeUri("Normal_Port_Forwarding.svg");
        }
        break;
      case "developing":
        treeItem.iconPath = resolveVSCodeUri("dev-start.svg");
        const container = await this.getContainer();
        if (container) {
          treeItem.label = `${this.label}(${container})`;
        }
        if (portForwardStatus) {
          treeItem.iconPath = resolveVSCodeUri("Dev_Port_Forwarding.svg");
        }
        break;
      case "starting":
        treeItem.iconPath = resolveVSCodeUri("loading.svg");
        break;
      case "unknown":
        treeItem.iconPath = resolveVSCodeUri("status-unknown.svg");
        break;
    }
    const check = await this.checkConfig();
    const isLocal = host.getGlobalState(IS_LOCAL);
    treeItem.contextValue = `${treeItem.contextValue}-${
      check ? "info" : "warn"
    }-${isLocal ? "local-" : ""}${status}`;
    if (this.firstRender) {
      this.firstRender = false;
    }
    return treeItem;
  }

  public async getStatus() {
    const appNode = this.getAppNode();
    let status = state.getAppState(
      appNode.name,
      `${this.getNodeStateId()}_status`
    );
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
    const deploy = await kubectl.loadResource(
      this.getKubeConfigPath(),
      this.resourceType,
      appNode.namespace,
      this.name,
      "json"
    );
    const deploymentObj = JSON.parse(deploy as string) as Resource;
    const tmpStatus = deploymentObj.status as ResourceStatus;
    if (tmpStatus.replicas === tmpStatus.readyReplicas) {
      status = "running";
    }
    if (!status) {
      status = "unknown";
    }
    return status;
  }

  public async refreshSvcProfile() {
    const appNode = this.getAppNode();
    this.svcProfile = await nhctl.getServiceConfig(
      appNode.getKubeConfigPath(),
      appNode.namespace,
      appNode.name,
      this.name,
      this.resourceType
    );
  }

  public async getPortForwardStatus() {
    if (this.svcProfile && this.svcProfile.devPortForwardList.length > 0) {
      const portForwardList = this.svcProfile.devPortForwardList.filter(
        (item) => {
          if (item.role === "SYNC") {
            return false;
          }
          return true;
        }
      );
      if (portForwardList.length > 0) {
        return true;
      }
    }
    return false;
  }
}
