import * as vscode from "vscode";
import * as nhctl from "../../../ctl/nhctl";
import { get as _get } from "lodash";
import { resolveVSCodeUri } from "../../../utils/fileUtil";
import state from "../../../state";
import ConfigService, {
  NocalhostServiceConfig,
} from "../../../service/configService";
import { KubernetesResourceNode } from "../../abstract/KubernetesResourceNode";
import {
  BaseNocalhostNode,
  DeploymentStatus,
  SvcProfile,
} from "../../types/nodeType";
import { Status, Resource, ResourceStatus } from "../../types/resourceType";

export abstract class ControllerResourceNode extends KubernetesResourceNode {
  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    treeItem.contextValue = `workload-${this.resourceType}`;
    return treeItem;
  }
  constructor(
    public parent: BaseNocalhostNode,
    public label: string,
    public name: string,
    public conditionsStatus?: Array<Status> | string,
    public svcProfile?: SvcProfile | undefined | null,
    public nocalhostService?: NocalhostServiceConfig | undefined | null,
    public info?: any
  ) {
    super();
    state.setNode(this.getNodeStateId(), this);
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
    const devPortForwardList = _get(this.svcProfile, "devPortForwardList");
    if (!Array.isArray(devPortForwardList)) {
      return false;
    }
    const portForwardList = devPortForwardList.filter((item) => {
      if (item.role === "SYNC") {
        return false;
      }
      return true;
    });
    if (portForwardList.length > 0) {
      return true;
    }
    return false;
  }

  public async getIconAndLabelByStatus(
    status: string
  ): Promise<[vscode.Uri, string]> {
    const portForwardStatus = await this.getPortForwardStatus();
    let iconPath,
      label = this.label;
    switch (status) {
      case "running":
        iconPath = resolveVSCodeUri("status-running.svg");
        if (portForwardStatus) {
          iconPath = resolveVSCodeUri("Normal_Port_Forwarding.svg");
        }
        break;
      case "developing":
        const possess = this.svcProfile.possess;
        iconPath = resolveVSCodeUri(
          possess === false ? "dev_other.svg" : "dev-start.svg"
        );
        const container = await this.getContainer();
        if (container) {
          label = `${this.label}(${container})`;
        }
        if (portForwardStatus) {
          iconPath = resolveVSCodeUri(
            possess === false
              ? "dev_port_forwarding_other.svg"
              : "Dev_Port_Forwarding.svg"
          );
        }
        break;
      case "starting":
        iconPath = resolveVSCodeUri("loading.svg");
        break;
      case "unknown":
        iconPath = resolveVSCodeUri("status-unknown.svg");
        break;
    }
    return [iconPath, label];
  }

  public getStatus(): string | Promise<string> {
    const appNode = this.getAppNode();
    const status = state.getAppState(
      appNode.name,
      `${this.getNodeStateId()}_status`
    );
    return status;
  }

  /**
   *
   * @param status
   * @param fresh Refresh dependencies
   */
  public async setStatus(status: string) {
    const appNode = this.getAppNode();
    if (status) {
      await state.setAppState(
        appNode.name,
        `${this.getNodeStateId()}_status`,
        status,
        {
          refresh: true,
          nodeStateId: this.getNodeStateId(),
        }
      );
    } else {
      await state.deleteAppState(
        appNode.name,
        `${this.getNodeStateId()}_status`,
        {
          refresh: true,
          nodeStateId: this.getNodeStateId(),
        }
      );
    }
  }

  public async getContainer() {
    const appNode = this.getAppNode();
    const status = state.getAppState(
      appNode.name,
      `${this.getNodeStateId()}_container`
    );
    return status;
  }

  public async setContainer(container: string) {
    const appNode = this.getAppNode();
    if (container) {
      await state.setAppState(
        appNode.name,
        `${this.getNodeStateId()}_container`,
        container,
        {
          refresh: true,
          nodeStateId: this.getNodeStateId(),
        }
      );
    } else {
      await state.deleteAppState(
        appNode.name,
        `${this.getNodeStateId()}_container`,
        {
          refresh: true,
          nodeStateId: this.getNodeStateId(),
        }
      );
    }
  }

  public checkConfig() {
    return Promise.resolve(true);
  }
}
