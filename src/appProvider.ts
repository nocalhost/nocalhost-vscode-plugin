import * as vscode from "vscode";

import nocalhostState from "./state";
import {
  BaseNocalhostNode,
  LoginNode,
  NocalhostRootNode,
} from "./nodes/nodeType";

export default class NocalhostAppProvider
  implements vscode.TreeDataProvider<BaseNocalhostNode> {
  private onDidChangeTreeDataEventEmitter = new vscode.EventEmitter<
    BaseNocalhostNode | undefined
  >();
  onDidChangeTreeData = this.onDidChangeTreeDataEventEmitter.event;
  getTreeItem(
    element: BaseNocalhostNode
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let item: vscode.TreeItem | Thenable<vscode.TreeItem>;
    item = element.getTreeItem();
    return item;
  }

  async getChildren(element?: BaseNocalhostNode) {
    const isLogin = nocalhostState.isLogin();
    let result: vscode.ProviderResult<BaseNocalhostNode[]> = [];
    if (!isLogin) {
      result = [new LoginNode()];

      return Promise.resolve(result);
    }

    if (element) {
      result = await element.getChildren();
    } else {
      result = await new NocalhostRootNode().getChildren();
    }

    return result;
  }

  refresh() {
    this.onDidChangeTreeDataEventEmitter.fire(undefined);
  }
}
