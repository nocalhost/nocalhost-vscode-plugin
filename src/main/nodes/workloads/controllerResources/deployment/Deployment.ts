import * as vscode from "vscode";
import * as yaml from "yaml";

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
  ServiceProfile,
  SvcProfile,
} from "../../../types/nodeType";
import { Status, Resource, ResourceStatus } from "../../../types/resourceType";
import { ControllerResourceNode } from "../ControllerResourceNode";
import validate from "../../../../utils/validate";

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
    status = await this.getStatus();
    switch (status) {
      case "running":
        treeItem.iconPath = resolveVSCodeUri("images/icons/status-running.svg");
        break;
      case "developing":
        treeItem.iconPath = resolveVSCodeUri("images/icons/dev-start.svg");
        break;
      case "starting":
        treeItem.iconPath = resolveVSCodeUri("images/icons/loading.svg");
        break;
      case "unknown":
        treeItem.iconPath = resolveVSCodeUri("images/icons/status-unknown.svg");
        break;
    }
    const check = await this.checkConfig();
    treeItem.contextValue = `${treeItem.contextValue}-${
      check ? "info" : "warn"
    }-${status}`;
    if (this.firstRender) {
      this.firstRender = false;
    }
    return treeItem;
  }

  public async getStatus() {
    const appNode = this.getAppNode();
    let status = state.getAppState(
      appNode.label,
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
        this.type,
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

  public async refreshSvcProfile() {
    const appNode = this.getAppNode();
    const infoStr = await nhctl
      .getServiceConfig(appNode.label, this.name)
      .catch((err) => {});
    if (infoStr) {
      const serviceProfile = yaml.parse(infoStr as string) as ServiceProfile;
      if (serviceProfile) {
        this.svcProfile = serviceProfile.svcProfile;
      }
    }
  }

  public async checkConfig() {
    const appNode = this.getAppNode();
    if (!this.firstRender) {
      this.nocalhostService = await ConfigService.getWorkloadConfig(
        appNode.label,
        this.name
      );
    }
    const schema = {
      type: "object",
      required: ["gitUrl", "devContainerImage", "name"],
      properties: {
        fundRaiseId: {
          type: "string",
          minLength: 1,
        },
        devContainerImage: {
          type: "string",
          minLength: 1,
        },
        name: {
          type: "string",
          minLength: 1,
        },
      },
    };
    return validate(this.nocalhostService || {}, schema);
  }
}
