import * as vscode from "vscode";

import * as kubectl from "../../../../ctl/kubectl";
import * as nhctl from "../../../../ctl/nhctl";
import ConfigService, {
  NocalhostServiceConfig,
} from "../../../../service/configService";
import state from "../../../../state";
import { resolveVSCodeUri } from "../../../../utils/fileUtil";
import { DEPLOYMENT } from "../../../nodeContants";
import {
  BaseNocalhostNode,
  DeploymentStatus,
  SvcProfile,
} from "../../../types/nodeType";
import { Status, Resource, ResourceStatus } from "../../../types/resourceType";
import { ControllerResourceNode } from "../ControllerResourceNode";
import validate from "../../../../utils/validate";
import host from "../../../../host";

export class Deployment extends ControllerResourceNode {
  public type = DEPLOYMENT;
  public resourceType = "deployment";
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
    try {
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
      treeItem.contextValue = `${treeItem.contextValue}-${
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
    } else {
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
      const status = deploymentObj.status as ResourceStatus;
      this.conditionsStatus =
        status.conditions || ((status as unknown) as string);
    }
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
