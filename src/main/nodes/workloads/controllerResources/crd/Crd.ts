import * as vscode from "vscode";

import { ControllerResourceNode } from "../ControllerResourceNode";

export class Crd extends ControllerResourceNode {
  public type: string = "CustomResources";
  public resourceType: string = "CustomResources";

  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();

    return treeItem;
  }
}
