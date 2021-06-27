import * as vscode from "vscode";

import * as nhctl from "../../../../ctl/nhctl";
import ConfigService from "../../../../service/configService";
import state from "../../../../state";
import { DEPLOYMENT } from "../../../nodeContants";
import { DeploymentStatus } from "../../../types/nodeType";
import { Resource, ResourceStatus } from "../../../types/resourceType";
import { ControllerResourceNode } from "../ControllerResourceNode";
import validate from "../../../../utils/validate";
import host from "../../../../host";

export class Deployment extends ControllerResourceNode {
  public type = DEPLOYMENT;
  public resourceType = "deployment";
  private firstRender = true;

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
      if (this.firstRender) {
        this.firstRender = false;
      }
    } catch (e) {
      this.firstRender = false;
      host.log(e, true);
    }

    return treeItem;
  }

  public async isDeveloping() {
    if (this.svcProfile && this.svcProfile.developing) {
      return true;
    }

    return false;
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

    const deploy = await nhctl.getLoadResource({
      kubeConfigPath: this.getKubeConfigPath(),
      kind: this.resourceType,
      name: this.name,
      namespace: appNode.namespace,
      outputType: "json",
    });
    const deploymentObj = JSON.parse(deploy as string) as Resource;
    status = deploymentObj.status as ResourceStatus;
    this.conditionsStatus =
      status.conditions || ((status as unknown) as string);
    if (Array.isArray(this.conditionsStatus)) {
      let available = false;
      let progressing = false;
      this.conditionsStatus.forEach((s) => {
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

  public async checkConfig() {
    const appNode = this.getAppNode();
    if (!this.firstRender) {
      this.nocalhostService = await ConfigService.getWorkloadConfig(
        appNode.getKubeConfigPath(),
        appNode.namespace,
        appNode.name,
        this.name,
        DEPLOYMENT
      );
    }
    const schema = {
      type: "object",
      required: ["containers"],
      properties: {
        containers: {
          type: "array",
          items: {
            type: "object",
            required: ["dev"],
            properties: {
              dev: {
                type: "object",
                required: ["gitUrl", "image"],
                properties: {
                  image: {
                    type: "string",
                    minLength: 1,
                  },
                  gitUrl: {
                    type: "string",
                    minLength: 1,
                  },
                },
              },
            },
          },
          minItems: 1,
        },
      },
    };
    return validate(this.nocalhostService || {}, schema);
  }

  public getConfig() {
    return this.nocalhostService;
  }
}
