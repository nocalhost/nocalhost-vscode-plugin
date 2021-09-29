import * as vscode from "vscode";
import * as nhctl from "../../../ctl/nhctl";
import { get as _get } from "lodash";
import { resolveVSCodeUri } from "../../../utils/fileUtil";
import state from "../../../state";
import { NocalhostServiceConfig } from "../../../service/configService";
import { KubernetesResourceNode } from "../../abstract/KubernetesResourceNode";
import {
  BaseNocalhostNode,
  DeploymentStatus,
  SvcProfile,
} from "../../types/nodeType";
import {
  IK8sResource,
  IStatus,
  IResourceStatus,
} from "./../../../domain/IK8sResource";
import { DevSpaceNode } from "../../DevSpaceNode";

export abstract class ControllerResourceNode extends KubernetesResourceNode {
  public label: string;
  public name: string;

  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();

    treeItem.contextValue = `workload-${this.resourceType}`;

    const devSpaceNode = this.getAppNode()?.getParent() as DevSpaceNode;
    if (devSpaceNode) {
      treeItem.contextValue = devSpaceNode.getSpaceOwnTypeContextValue(
        treeItem.contextValue
      );
    }

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
  public async isDeveloping() {
    if (this.svcProfile && this.svcProfile.developing) {
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
      case "complete":
      case "running":
        iconPath = resolveVSCodeUri("status_running.svg");
        if (portForwardStatus) {
          iconPath = resolveVSCodeUri("normal_port_forwarding.svg");
        }
        break;
      case "developing":
      case DeploymentStatus.duplicateDevMode:
        const possess = this.svcProfile.possess;
        iconPath = resolveVSCodeUri(
          possess === false
            ? "dev_other.svg"
            : status === DeploymentStatus.duplicateDevMode
            ? "dev_copy.svg"
            : "dev_start.svg"
        );
        const container = await this.getContainer();
        if (container) {
          label = `${this.label}(${container})`;
        }
        if (portForwardStatus) {
          iconPath = resolveVSCodeUri(
            possess === false
              ? "dev_port_forwarding_other.svg"
              : "dev_port_forwarding.svg"
          );
        }
        break;
      case "starting":
        iconPath = resolveVSCodeUri("loading.gif");
        break;
      case "unknown":
        iconPath = resolveVSCodeUri("status_unknown.svg");
        break;
      case "failed":
        iconPath = resolveVSCodeUri("status_failed.svg");
        break;
    }
    return [iconPath, label];
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
        appNode.getNodeStateId(),
        `${this.getNodeStateId()}_status`,
        status,
        {
          refresh: true,
          nodeStateId: this.getNodeStateId(),
        }
      );
    } else {
      await state.deleteAppState(
        appNode.getNodeStateId(),
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
        appNode.getNodeStateId(),
        `${this.getNodeStateId()}_container`,
        container,
        {
          refresh: true,
          nodeStateId: this.getNodeStateId(),
        }
      );
    } else {
      await state.deleteAppState(
        appNode.getNodeStateId(),
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

  public async getStatus(refresh = false) {
    const appNode = this.getAppNode();
    let status = state.getAppState(
      appNode.getNodeStateId(),
      `${this.getNodeStateId()}_status`
    );
    if (status) {
      return Promise.resolve(status);
    }

    if (refresh) {
      await this.refreshSvcProfile();
    }

    if (this.svcProfile && this.svcProfile.duplicateDevMode) {
      return DeploymentStatus.duplicateDevMode;
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
}
