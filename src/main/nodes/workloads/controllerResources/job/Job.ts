import * as vscode from "vscode";
import { ControllerResourceNode } from "../ControllerResourceNode";
import { JOB } from "../../../nodeContants";
import logger from "../../../../utils/logger";

export class Job extends ControllerResourceNode {
  public type = JOB;
  public resourceType = "job";
  private firstRender = true;

  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    try {
      let status = "";
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
      logger.error("job getTreeItem");
      logger.error(e);
    }
    return treeItem;
  }
}
