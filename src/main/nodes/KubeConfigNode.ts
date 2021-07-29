import * as vscode from "vscode";
import * as fs from "fs";
import { orderBy } from "lodash";
import { HELM_NH_CONFIG_DIR } from "../constants";
import state from "../state";
import AccountClusterService from "../clusters/AccountCluster";
import { ID_SPLIT } from "./nodeContants";
import * as path from "path";
import { ClusterSource } from "../common/define";
import { BaseNocalhostNode } from "./types/nodeType";
import { NocalhostFolderNode } from "./abstract/NocalhostFolderNode";
import { NocalhostRootNode } from "./NocalhostRootNode";
import { resolveVSCodeUri, writeFileLock } from "../utils/fileUtil";
import * as _ from "lodash";
import { DevSpaceNode } from "./DevSpaceNode";
import { IUserInfo, IDevSpaceInfo, IV2ApplicationInfo } from "../domain";
import { type } from "os";

export type KubeConfigState = { code: 200 | 201; info: string };

export class KubeConfigNode extends NocalhostFolderNode {
  public label: string;
  public type = "KUBECONFIG";
  public devSpaceInfos: IDevSpaceInfo[];
  public userInfo: IUserInfo;
  public clusterSource: ClusterSource;
  public applications: Array<IV2ApplicationInfo>;
  public parent: NocalhostRootNode;
  public installedApps: {
    name: string;
    type: string;
  }[] = [];
  public id: string;
  public kubeConfigPath: string;
  public accountClusterService: AccountClusterService;

  private state: KubeConfigState;
  constructor(props: {
    id: string;
    parent: NocalhostRootNode;
    label: string;
    devSpaceInfos: IDevSpaceInfo[];
    applications: Array<IV2ApplicationInfo>;
    clusterSource: ClusterSource;
    kubeConfigPath: string;
    userInfo: IUserInfo;
    accountClusterService?: AccountClusterService;
    state: KubeConfigState;
  }) {
    super();
    const {
      id,
      parent,
      label,
      devSpaceInfos,
      applications,
      clusterSource,
      kubeConfigPath,
      userInfo,
      accountClusterService,
    } = props;
    this.id = id;
    this.parent = parent;
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
    const devs: DevSpaceNode[] = [];

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
      devs.push(node);
    }

    return orderBy(devs, ["label"]);
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

      treeItem.tooltip = `${this.label} [${username} on ${baseUrl}]`;
    }

    treeItem.description =
      this.state.code === 200 ? "Active" : "Unable to Connect";

    if (this.state.code !== 200) {
      treeItem.tooltip = this.state.info;
      treeItem.iconPath = resolveVSCodeUri("status-warning.svg");
    }

    return Promise.resolve(treeItem);
  }

  getNodeStateId(): string {
    return `${this.id}${this.parent.getNodeStateId()}${ID_SPLIT}${this.label}`;
  }

  getParent(): NocalhostRootNode {
    return this.parent;
  }
}
