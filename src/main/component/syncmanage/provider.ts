import * as vscode from "vscode";
import { isEqual } from "lodash";

import { associateQuery, Associate } from "../../ctl/nhctl";
import logger from "../../utils/logger";
import { BaseNode, BaseNodeType, GroupNode } from "./node";

let associateData: {
  current: Associate.QueryResult[];
  other: Associate.QueryResult[];
};

export class SyncManageProvider
  implements vscode.TreeDataProvider<BaseNodeType> {
  private time: NodeJS.Timeout;
  private onDidChangeTreeDataEventEmitter = new vscode.EventEmitter<
    BaseNodeType | undefined
  >();
  readonly onDidChangeTreeData?: vscode.Event<void | BaseNodeType> = this
    .onDidChangeTreeDataEventEmitter.event;
  constructor() {
    vscode.window.onDidChangeActiveColorTheme(() => this.refresh());
  }

  changeVisible(visible: boolean) {
    if (visible) {
      this.refresh(true);
    } else {
      clearTimeout(this.time);
    }
  }
  getParent(element?: BaseNodeType): vscode.ProviderResult<BaseNodeType> {
    if (element) {
      return element.parent;
    }
    return undefined;
  }
  async getData(refresh = false) {
    if (!associateData || refresh) {
      const list =
        ((await associateQuery({})) as Associate.QueryResult[]) || [];

      associateData = {
        current: [list.pop()],
        other: list,
      };
    }

    return associateData;
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

    if (list.current.length === 0 && list.other.length === 0) {
      return [new BaseNode(element, "Waiting for enter DevMode")];
    }

    if (list.other.length === 0) {
      return [new GroupNode(element, "current", list.current)];
    }

    return [
      new GroupNode(element, "current", list.current),
      new GroupNode(element, "other", list.other),
    ];
  }

  public async refresh(force: boolean = false) {
    clearTimeout(this.time);

    try {
      const newAssociateData = await this.getData(true);

      if (!isEqual(newAssociateData, associateData) || force) {
        this.onDidChangeTreeDataEventEmitter.fire(undefined);
      }
    } catch (error) {
      logger.error("SyncManageProvider refresh", error);
    } finally {
      this.time = setTimeout(async () => {
        this.refresh();
      }, 5_000);
    }
  }
}
