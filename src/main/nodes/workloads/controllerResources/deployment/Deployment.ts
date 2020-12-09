import * as vscode from "vscode";

import * as kubectl from "../../../../ctl/kubectl";
import host from "../../../../host";
import ConfigService from "../../../../service/configService";
import state from "../../../../state";
import { resolveVSCodeUri } from "../../../../utils/fileUtil";
import { DEPLOYMENT } from "../../../nodeContants";
import { BaseNocalhostNode, DeploymentStatus } from "../../../types/nodeType";
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
    public info?: any
  ) {
    super();
  }

  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    let status = "";
    status = await this.getStatus();
    switch (status) {
      case "running":
        treeItem.iconPath = resolveVSCodeUri("images/icons/status-normal.svg");
        break;
      case "developing":
        treeItem.iconPath = resolveVSCodeUri("images/icons/status-running.svg");
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
    const appInfo = await appNode.getApplicationInfo();
    const svcProfile = appInfo.svcProfile;
    for (let i = 0; i < svcProfile.length; i++) {
      if (svcProfile[i].name === this.name && svcProfile[i].developing) {
        return DeploymentStatus.developing;
      }
    }
    if (this.firstRender) {
      this.firstRender = false;
    } else {
      const deploy = await kubectl.loadResource(
        host,
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

  public async checkConfig() {
    const appNode = this.getAppNode();
    const workloadConfig = await ConfigService.getWorkloadConfig(
      appNode.label,
      this.name
    );
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
    return validate(workloadConfig, schema);
  }
}
