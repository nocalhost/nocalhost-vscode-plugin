import * as vscode from "vscode";
import state from "../../../../state";
import host from "../../../../host";
import * as nhctl from "../../../../ctl/nhctl";
import { DAEMON_SET } from "../../../nodeContants";
import { Resource, ResourceStatus } from "../../../types/resourceType";
import { DeploymentStatus, BaseNocalhostNode } from "../../../types/nodeType";
import { ControllerResourceNode } from "../ControllerResourceNode";
export class DaemonSet extends ControllerResourceNode {
  public type = DAEMON_SET;
  public resourceType = "daemonSet";
  private firstRender = true;

  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    let status = "";
    try {
      status = await this.getStatus();
      const [icon, label, mode] = await this.getIconAndLabelByStatus(status);
      treeItem.iconPath = icon;
      treeItem.label = label;
      const check = await this.checkConfig();
      treeItem.contextValue = `${treeItem.contextValue}-dev-${
        check ? "info" : "warn"
      }-${status}-${mode}`;
      if (this.firstRender) {
        this.firstRender = false;
      }
    } catch (e) {
      this.firstRender = false;
      host.log(e, true);
    }

    return treeItem;
  }
}
