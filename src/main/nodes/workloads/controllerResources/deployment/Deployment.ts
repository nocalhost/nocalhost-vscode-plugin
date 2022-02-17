import vscode from "vscode";
import { DEPLOYMENT } from "../../../nodeContants";
import { ControllerResourceNode } from "../ControllerResourceNode";
import logger from "../../../../utils/logger";

export class Deployment extends ControllerResourceNode {
  public type = DEPLOYMENT;
  public resourceType = "deployment";

  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    let status = "";
    try {
      status = await this.getStatus();
      const [icon, label, mode] = await this.getIconAndLabelByStatus(status);
      treeItem.iconPath = icon;
      treeItem.label = label;
      treeItem.contextValue = `${treeItem.contextValue}-dev-${status}-${mode}`;
    } catch (e) {
      logger.error("deployment getTreeItem");
      logger.error(e);
    }

    return treeItem;
  }
}
