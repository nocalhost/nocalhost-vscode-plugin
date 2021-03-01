import * as vscode from "vscode";

import * as nhctl from "../../../../ctl/nhctl";
import { resolveVSCodeUri } from "../../../../utils/fileUtil";
import state from "../../../../state";
import { STATEFUL_SET } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";
import { ControllerResourceNode } from "../ControllerResourceNode";

export class StatefulSet extends ControllerResourceNode {
  public type = STATEFUL_SET;
  public resourceType = "statefulSet";
  constructor(
    public parent: BaseNocalhostNode,
    public label: string,
    public name: string,
    public info?: any
  ) {
    super();
    state.setNode(this.getNodeStateId(), this);
  }

  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    const portForwardStatus = await this.getPortForwardStatus();
    if (portForwardStatus) {
      treeItem.iconPath = resolveVSCodeUri("Normal_Port_Forwarding.svg");
    }
    return treeItem;
  }

  public async getPortForwardStatus() {
    const appNode = this.getAppNode();
    const svcProfile = await nhctl.getServiceConfig(appNode.name, this.name);
    if (svcProfile && svcProfile.devPortForwardList.length > 0) {
      return true;
    }
    return false;
  }
}
