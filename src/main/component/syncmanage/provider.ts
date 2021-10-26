import * as vscode from "vscode";
import { isEqual } from "lodash";

import { associateQuery, Associate } from "../../ctl/nhctl";
import logger from "../../utils/logger";
import { BaseNode, BaseNodeType, GroupNode } from "./node";

export class SyncManageDataProvider
  extends vscode.Disposable
  implements vscode.TreeDataProvider<BaseNodeType> {
  private time: NodeJS.Timeout;
  private onDidChangeTreeDataEventEmitter = new vscode.EventEmitter<
    BaseNodeType | undefined
  >();
  readonly onDidChangeTreeData?: vscode.Event<void | BaseNodeType> = this
    .onDidChangeTreeDataEventEmitter.event;

  private disposable: vscode.Disposable[] = [];

  private associateData: {
    current: Associate.QueryResult;
    switchCurrent?: Associate.QueryResult;
    other: Associate.QueryResult[];
  };

  constructor() {
    super(() => {
      this.disposable.forEach((item) => item.dispose());
    });

    this.disposable.push(
      vscode.window.onDidChangeActiveColorTheme(() => this.refresh()),
      {
        dispose: () => {
          clearTimeout(this.time);
        },
      }
    );
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
    if (!this.associateData || refresh) {
      const list =
        ((await associateQuery({})) as Associate.QueryResult[]) || [];
      let current = (await associateQuery({
        current: true,
      })) as Associate.QueryResult;

      let { switchCurrent } = this.associateData ?? {};

      if (
        switchCurrent &&
        list.find((item) => item.sha === switchCurrent.sha)
      ) {
        current = switchCurrent;
      }

      const other = list.filter((item) => item.sha !== current.sha);

      this.associateData = {
        current,
        switchCurrent,
        other,
      };
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

    if (!list.current && list.other.length === 0) {
      return [new BaseNode(element, "Waiting for enter DevMode")];
    }

    let children: BaseNode[] = [];

    if (list.other.length) {
      children.push(new GroupNode(element, "other", list.other));
    }

    if (list.current) {
      children.push(new GroupNode(element, "current", [list.current]));
    }

    return children;
  }

  public async switchCurrent(node: Associate.QueryResult) {
    const { other, current } = this.associateData;

    this.associateData = {
      other: [current, ...other].filter((item) => item.sha !== node.sha),
      current: node,
      switchCurrent: node,
    };

    this.onDidChangeTreeDataEventEmitter.fire(undefined);
  }

  public async refresh(force: boolean = false) {
    clearTimeout(this.time);

    try {
      const associateData = this.associateData;

      await this.getData(true);

      if (!isEqual(associateData, this.associateData) || force) {
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
