import vscode from "vscode";
import host from "../../../../host";
import { DAEMON_SET } from "../../../nodeContants";
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
      treeItem.contextValue = `${treeItem.contextValue}-dev-${status}-${mode}`;
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
