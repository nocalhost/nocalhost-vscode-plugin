import * as vscode from "vscode";
import { orderBy } from "lodash";

import state from "../state";
import AccountClusterService from "../clusters/AccountCluster";
import { ID_SPLIT } from "./nodeContants";
import { ClusterSource } from "../common/define";
import { BaseNocalhostNode } from "./types/nodeType";
import { NocalhostFolderNode } from "./abstract/NocalhostFolderNode";
import { resolveVSCodeUri } from "../utils/fileUtil";
import { DevSpaceNode } from "./DevSpaceNode";
import { ClustersState } from "../clusters";
import { IRootNode } from "../domain";

export class KubeConfigNode extends NocalhostFolderNode {
  type: string;

  public id: string;
  private clustersState: ClustersState;
  public clusterSource: ClusterSource;
  public accountClusterService: AccountClusterService;

  constructor(
    public parent: BaseNocalhostNode,
    public label: string,
    rootNode: IRootNode
  ) {
    super();

    const { id, clusterSource, accountClusterService } = rootNode;

    this.clustersState = rootNode.state;
    this.clusterSource = clusterSource;
    this.id = id;
    this.accountClusterService = accountClusterService;

    state.setNode(this.getNodeStateId(), this);
  }
  updateData(): any {
    return [];
  }

  public get kubeConfigPath() {
    return "";
  }

  async getChildren(parent?: BaseNocalhostNode): Promise<BaseNocalhostNode[]> {
    const devSpaces: (DevSpaceNode & {
      order?: boolean;
      isSpace?: boolean;
    })[] = [];

    return orderBy(
      devSpaces,
      ["order", "isSpace", "label"],
      ["desc", "desc", "asc"]
    );
  }

  async getTreeItem() {
    let treeItem = new vscode.TreeItem(
      this.label,
      this.clustersState.code === 200
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    treeItem.contextValue = `kubeconfig${
      this.clusterSource === ClusterSource.local ? "-local" : "-server"
    }`;

    if (this.clusterSource === ClusterSource.server) {
      const { username, baseUrl } = this.accountClusterService.loginInfo;

      treeItem.tooltip = `${this.label} [${username} on ${baseUrl}]`;
    }

    treeItem.description = "Active";
    treeItem.iconPath = resolveVSCodeUri("cluster_active.svg");

    if (this.clustersState.code !== 200) {
      treeItem.tooltip = this.clustersState.err;
      treeItem.iconPath = resolveVSCodeUri("cluster_warning.svg");
      treeItem.description = "Unable to Connect";
    }

    return Promise.resolve(treeItem);
  }

  getNodeStateId(): string {
    return `${this.id}${this.parent.getNodeStateId()}${ID_SPLIT}${this.label}`;
  }

  getParent(): BaseNocalhostNode {
    return this.parent;
  }
}
