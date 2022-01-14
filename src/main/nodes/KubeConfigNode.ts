import * as vscode from "vscode";
import { orderBy } from "lodash";
import { HELM_NH_CONFIG_DIR, NOCALHOST } from "../constants";
import state from "../state";
import AccountClusterService from "../clusters/AccountCluster";
import { ID_SPLIT } from "./nodeContants";
import * as path from "path";
import { ClusterSource } from "../common/define";
import { BaseNocalhostNode } from "./types/nodeType";
import { NocalhostFolderNode } from "./abstract/NocalhostFolderNode";
import { resolveVSCodeUri, writeFileLock } from "../utils/fileUtil";
import { DevSpaceNode } from "./DevSpaceNode";
import { IUserInfo, IDevSpaceInfo, IV2ApplicationInfo } from "../domain";
import { ClustersState } from "../clusters";

export class KubeConfigNode extends NocalhostFolderNode {
  public label: string;
  parent: BaseNocalhostNode = null;

  public type = "KUBECONFIG";
  public devSpaceInfos: IDevSpaceInfo[];
  public userInfo: IUserInfo;
  public clusterSource: ClusterSource;
  public applications: Array<IV2ApplicationInfo>;
  public installedApps: {
    name: string;
    type: string;
  }[] = [];
  public id: string;
  public kubeConfigPath: string;
  public accountClusterService: AccountClusterService;

  private state: ClustersState;
  constructor(props: {
    id: string;
    label: string;
    devSpaceInfos: IDevSpaceInfo[];
    applications: Array<IV2ApplicationInfo>;
    clusterSource: ClusterSource;
    kubeConfigPath: string;
    userInfo: IUserInfo;
    accountClusterService?: AccountClusterService;
    state: ClustersState;
  }) {
    super();
    const {
      id,
      label,
      devSpaceInfos,
      applications,
      clusterSource,
      kubeConfigPath,
      userInfo,
      accountClusterService,
    } = props;
    this.id = id;
    this.clusterSource = clusterSource;
    this.label =
      label || (devSpaceInfos.length > 0 ? devSpaceInfos[0].namespace : "");
    this.devSpaceInfos = devSpaceInfos;
    this.applications = applications;
    this.installedApps = [];
    this.kubeConfigPath = kubeConfigPath;
    this.userInfo = userInfo;
    this.accountClusterService = accountClusterService;
    this.state = props.state;

    state.setNode(this.getNodeStateId(), this);
  }
  updateData(): any {
    return [];
  }

  public getKubeConfigPath() {
    return this.kubeConfigPath;
  }

  async getChildren(parent?: BaseNocalhostNode): Promise<BaseNocalhostNode[]> {
    let res = {
      devSpaces: this.devSpaceInfos,
      applications: this.applications,
    };
    const devs: (DevSpaceNode & { order?: boolean; isSpace?: boolean })[] = [];

    res.applications.forEach(async (app) => {
      let context = app.context;
      const obj = {
        nocalhostConfig: "",
      };
      if (context) {
        let jsonObj = JSON.parse(context);
        obj.nocalhostConfig = jsonObj["nocalhostConfig"];
      }

      const nhConfigPath = path.resolve(HELM_NH_CONFIG_DIR, `${app.id}_config`);
      await writeFileLock(nhConfigPath, obj.nocalhostConfig || "");
    });
    for (const d of res.devSpaces) {
      const node = new DevSpaceNode(
        this,
        d.spaceName,
        d,
        res.applications,
        this.clusterSource
      );
      devs.push(
        Object.assign(node, {
          order: d.spaceOwnType !== "Viewer",
          isSpace: d.spaceId > 0,
        })
      );
    }

    return orderBy(
      devs,
      ["order", "isSpace", "label"],
      ["desc", "desc", "asc"]
    );
  }

  async getTreeItem() {
    let treeItem = new vscode.TreeItem(
      this.label,
      this.state.code === 200
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    treeItem.contextValue = `kubeconfig${
      this.clusterSource === ClusterSource.local ? "-local" : "-server"
    }`;

    if (this.clusterSource === ClusterSource.server) {
      const { username, baseUrl } = this.accountClusterService.loginInfo;

      treeItem.tooltip = `${username} [${baseUrl}]`;
    }

    treeItem.description = "Active";
    treeItem.iconPath = resolveVSCodeUri("cluster_active.svg");

    if (this.state.code !== 200) {
      treeItem.iconPath = resolveVSCodeUri("cluster_warning.svg");

      if (this.state.info !== "No clusters") {
        treeItem.tooltip = this.state.info;
        treeItem.description = "Unable to Connect";
      } else {
        treeItem.label = this.accountClusterService.loginInfo.username;
        treeItem.description = "Cluster not found";
      }
    }

    return Promise.resolve(treeItem);
  }

  getNodeStateId(): string {
    return `${this.id}${NOCALHOST}${ID_SPLIT}${this.label}`;
  }

  getParent(): null {
    return null;
  }
}
