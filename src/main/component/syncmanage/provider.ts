import * as vscode from "vscode";
import { associateQuery } from "../../ctl/nhctl";
import { AssociateQueryResult } from "../../ctl/nhctl.types";

interface BaseNodeType {
  label: string;
  isExpand: boolean;
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem>;
  getChildren(element?: BaseNodeType): vscode.ProviderResult<BaseNodeType[]>;
}

const statusDic = {
  outOfSync: "warning",
  disconnected: "debug-disconnect",
  scanning: "sync~spin",
  error: "error",
  syncing: "cloud-upload",
  idle: "check",
  end: "error",
};
type StatusType = typeof statusDic;

interface SyncNode extends BaseNodeType {
  status: keyof StatusType;
}

class BaseNode implements BaseNodeType {
  constructor(public label: string, public isExpand: boolean = false) {}
  getTreeItem(): vscode.TreeItem {
    return new vscode.TreeItem(this.label);
  }
  getChildren(element?: BaseNodeType): vscode.ProviderResult<BaseNodeType[]> {
    return [];
  }
}

class GroupNode extends BaseNode {
  constructor(
    type: "related" | "current",
    private children: AssociateQueryResult[] = []
  ) {
    super(type === "related" ? "Related Service" : "Current Service");
  }
  getChildren(element?: BaseNodeType): vscode.ProviderResult<BaseNodeType[]> {
    return this.children.map((child) => new AssociateNode(child));
  }
}

class AssociateNode extends BaseNode {
  constructor(private associate: AssociateQueryResult) {
    super(associate.svc_pack.svc);
  }
  getChildren(element?: BaseNodeType): vscode.ProviderResult<BaseNodeType[]> {
    return [];
  }
  getTreeItem() {
    const treeItem = super.getTreeItem();
    treeItem.description = this.associate.syncthing_status.msg;

    return treeItem;
  }
}

export class SyncManageProvider
  implements vscode.TreeDataProvider<BaseNodeType> {
  private onDidChangeTreeDataEventEmitter = new vscode.EventEmitter<
    BaseNodeType | undefined
  >();
  onDidChangeTreeData?: vscode.Event<void | BaseNodeType>;
  constructor(private associateData: AssociateQueryResult[] = null) {
    vscode.window.onDidChangeActiveColorTheme(() => this.refresh());
  }
  async getData() {
    if (!this.associateData) {
      this.associateData = (await associateQuery({})) as AssociateQueryResult[];
    }

    return this.associateData;
  }

  getTreeItem(
    element: BaseNodeType
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element.getTreeItem();
  }

  async getChildren(element?: BaseNodeType) {
    if (element) {
      return element.getChildren();
    }

    const list = await this.getData();

    if (list.length === 0) {
      return [new BaseNode("Waiting for enter DevMode")];
    }

    if (list.length === 1) {
      return [new GroupNode("current")];
    }

    return [new GroupNode("current"), new GroupNode("related")];
  }

  refresh(node?: BaseNodeType) {
    this.onDidChangeTreeDataEventEmitter.fire(node);
  }
}
