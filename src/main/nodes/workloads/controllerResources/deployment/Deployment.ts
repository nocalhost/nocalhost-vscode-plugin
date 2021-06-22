import * as vscode from "vscode";

import ConfigService from "../../../../service/configService";
import { DEPLOYMENT } from "../../../nodeContants";
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
