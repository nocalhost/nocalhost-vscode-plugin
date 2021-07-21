import * as vscode from "vscode";
import { DEPLOYMENT } from "../../../nodeContants";
import { ControllerResourceNode } from "../ControllerResourceNode";
import { checkWorkloadConfig } from '../../../../utils/checkConfig';
import logger from "../../../../utils/logger";

export class Deployment extends ControllerResourceNode {
  public type = DEPLOYMENT;
  public resourceType = "deployment";

  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    let status = "";
    try {
      status = await this.getStatus();
      const [icon, label] = await this.getIconAndLabelByStatus(status);
      treeItem.iconPath = icon;
      treeItem.label = label;
      const check = checkWorkloadConfig(this.nocalhostService);
      treeItem.contextValue = `${treeItem.contextValue}-dev-${
        check ? "info" : "warn"
      }-${status}`;
    } catch (e) {
      logger.error("deployment getTreeItem");
      logger.error(e);
    }

    return treeItem;
  }

  public getConfig() {
    return this.nocalhostService;
  }
}
