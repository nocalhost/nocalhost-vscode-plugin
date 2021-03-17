import * as vscode from "vscode";
import { NocalhostRootNode } from "./nodes/NocalhostRootNode";
import { BaseNocalhostNode } from "./nodes/types/nodeType";
import nocalhostState from "./state";

export default class NocalhostAppProvider
  implements vscode.TreeDataProvider<BaseNocalhostNode> {
  private onDidChangeTreeDataEventEmitter = new vscode.EventEmitter<
    BaseNocalhostNode | undefined
  >();
  constructor() {
    vscode.window.onDidChangeActiveColorTheme(() => this.refresh());
  }
  onDidChangeTreeData = this.onDidChangeTreeDataEventEmitter.event;
  async getTreeItem(element: BaseNocalhostNode): Promise<vscode.TreeItem> {
    let item: vscode.TreeItem | Thenable<vscode.TreeItem>;
    item = await element.getTreeItem();
    return item;
  }

  async getChildren(element?: BaseNocalhostNode) {
    const isLogin = nocalhostState.isLogin();
    let result: vscode.ProviderResult<BaseNocalhostNode[]> = [];
    if (!isLogin) {
      return Promise.resolve([]);
    }

    if (element) {
      result = await element.getChildren();
    } else {
      result = await new NocalhostRootNode(null).getChildren();
    }

    return result;
  }

  getParent(element: BaseNocalhostNode): BaseNocalhostNode | null | undefined {
    const parent = element.getParent();
    return parent;
  }

  refresh(node?: BaseNocalhostNode) {
    this.onDidChangeTreeDataEventEmitter.fire(node);
  }
}
