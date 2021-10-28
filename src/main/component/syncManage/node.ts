import * as vscode from "vscode";
import { sortBy } from "lodash";

import { Associate, getIconIdByStatus } from "../../ctl/nhctl";
import host from "../../host";

export interface BaseNodeType {
  label: string;
  readonly parent: BaseNodeType;
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem>;
  getChildren(element?: BaseNodeType): vscode.ProviderResult<BaseNodeType[]>;
}

export class BaseNode implements BaseNodeType {
  constructor(
    public readonly parent: BaseNodeType,
    public label: string,
    public collapsibleState?: vscode.TreeItemCollapsibleState
  ) {}
  getTreeItem(): vscode.TreeItem {
    return new vscode.TreeItem(this.label, this.collapsibleState);
  }
  getChildren(element?: BaseNodeType): vscode.ProviderResult<BaseNodeType[]> {
    return [];
  }
}

type GroupType = "other" | "current";
export class GroupNode extends BaseNode {
  constructor(
    public readonly parent: BaseNodeType,
    public type: GroupType,
    private children: Associate.QueryResult[] = []
  ) {
    super(
      parent,
      type === "other" ? "Associate Service" : "Current Display Service",
      vscode.TreeItemCollapsibleState.Expanded
    );
  }
  getChildren(element?: GroupNode): vscode.ProviderResult<BaseNodeType[]> {
    const currentPath = host.getCurrentRootPath();
    return sortBy(this.children, [
      "svc_pack.ns",
      "svc_pack.app",
      "svc_pack.svc",
    ]).map((child) => new AssociateNode(this, currentPath, child));
  }
}

export class AssociateNode extends BaseNode {
  constructor(
    public readonly parent: GroupNode,
    public currentPath: string,
    public associate: Associate.QueryResult
  ) {
    super(parent, associate.svc_pack.svc);
  }
  getChildren(element?: BaseNodeType): vscode.ProviderResult<BaseNodeType[]> {
    return [];
  }

  getTreeItem() {
    const treeItem = super.getTreeItem();

    const {
      server,
      syncthing_status: { msg, status },
      svc_pack: { ns, app, svc_type, svc },
    } = this.associate;

    treeItem.label = [ns, app, svc].join("/");
    treeItem.description = msg;
    treeItem.tooltip = [server, ns, app, svc_type, svc].join("/");

    treeItem.iconPath = new vscode.ThemeIcon(getIconIdByStatus(status));
    treeItem.contextValue = `syncAssociate-${this.parent.type}`;

    let statusValue: string = "-";

    switch (status) {
      case "end":
        statusValue += "disassociate";
        break;
      case "disconnected":
        statusValue += "resume";
        break;
      case "error":
        statusValue += "override-resume";
        break;
      default:
        statusValue += "override";
        break;
    }

    treeItem.contextValue += statusValue;

    return treeItem;
  }
}
