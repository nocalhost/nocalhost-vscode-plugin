import * as vscode from "vscode";
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
    return this.children.map(
      (child) => new AssociateNode(this, currentPath, child)
    );
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

    const { ns, app, svc_type, svc } = this.associate.svc_pack;

    treeItem.description = this.associate.syncthing_status.msg;
    treeItem.tooltip = [this.associate.server, ns, app, svc_type, svc].join(
      "/"
    );
    treeItem.iconPath = new vscode.ThemeIcon(
      getIconIdByStatus(this.associate.syncthing_status.status)
    );

    treeItem.contextValue = `syncAssociate-${this.parent.type}`;

    let statusValue: string = "-";

    const { status } = this.associate.syncthing_status;
    switch (status) {
      case "disconnected":
      case "error":
        statusValue += "resume";
        break;
      case "end":
        statusValue += "diassociate";
        break;
      default:
        statusValue += "override";
    }

    treeItem.contextValue += statusValue;

    return treeItem;
  }
}
