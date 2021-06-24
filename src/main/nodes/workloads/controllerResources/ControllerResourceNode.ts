import {
  IK8sResource,
  IStatus,
  IResourceStatus,
} from "./../../../domain/IK8sResource";
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

export abstract class ControllerResourceNode extends KubernetesResourceNode {
  public label: string;
  public name: string;

  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    treeItem.contextValue = `workload-${this.resourceType}`;
    return treeItem;
  }
  constructor(
    public parent: BaseNocalhostNode,
    public resource: IK8sResource,
    public conditionsStatus?: Array<IStatus> | string,
    public svcProfile?: SvcProfile | undefined | null,
    public nocalhostService?: NocalhostServiceConfig | undefined | null
  ) {
    super();
    this.label = resource.metadata.name;
    this.name = resource.metadata.name;
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

    const resourceStatus = this.resource.status as IResourceStatus;
    const conditionsStatus = resourceStatus.conditions;
    if (Array.isArray(conditionsStatus)) {
      let available = false;
      let progressing = false;
      conditionsStatus.forEach((s) => {
        if (s.type === "Available" && s.status === "True") {
          status = "running";
          available = true;
        } else if (s.type === "Progressing" && s.status === "True") {
          progressing = true;
        }
      });

      if (progressing && !available) {
        status = "starting";
      }
    }
    if (!status) {
      status = "unknown";
    }
    return status;
  }

  public async isDeveloping() {
    if (this.svcProfile && this.svcProfile.developing) {
      return true;
    }

    return false;
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
