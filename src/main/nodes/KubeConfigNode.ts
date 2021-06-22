import { ClusterSource } from "./../clusters/interface";
import * as vscode from "vscode";
import * as fs from "fs";
import { orderBy } from "lodash";
import { HELM_NH_CONFIG_DIR, KUBE_CONFIG_DIR } from "../constants";
import state from "../state";
import AccountClusterService from "../clusters/AccountCluster";
import { ID_SPLIT } from "./nodeContants";
import * as path from "path";
import { BaseNocalhostNode } from "./types/nodeType";
import { NocalhostFolderNode } from "./abstract/NocalhostFolderNode";
import { NocalhostRootNode } from "./NocalhostRootNode";
import { DevspaceInfo, V2ApplicationInfo } from "../api";
import * as _ from "lodash";
import { DevSpaceNode } from "./DevSpaceNode";
import { IUserInfo } from "../domain";
import { isExistSync } from "../utils/fileUtil";

export class KubeConfigNode extends NocalhostFolderNode {
  public label: string;
  public type = "KUBECONFIG";
  public devSpaceInfos: DevspaceInfo[];
  public userInfo: IUserInfo;
  public clusterSource: ClusterSource;
  public applications: Array<V2ApplicationInfo>;
  public parent: NocalhostRootNode;
  public installedApps: {
    name: string;
    type: string;
  }[] = [];
  public id: string;
  public kubeConfigPath: string;
  public accountClusterService: AccountClusterService;
  constructor(props: {
    id: string;
    parent: NocalhostRootNode;
    label: string;
    devSpaceInfos: DevspaceInfo[];
    clusterSource: ClusterSource;
    applications: Array<V2ApplicationInfo>;
    kubeConfigPath: string;
    userInfo: IUserInfo;
    accountClusterService: AccountClusterService;
  }) {
    super();
    const {
      id,
      parent,
      devSpaceInfos,
      label,
      applications,
      kubeConfigPath,
      userInfo,
      clusterSource,
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

    res.applications.forEach((app) => {
      let context = app.context;
      const obj = {
        nocalhostConfig: "",
      };
      if (context) {
        let jsonObj = JSON.parse(context);
        obj.nocalhostConfig = jsonObj["nocalhostConfig"];
      }

      const nhConfigPath = path.resolve(HELM_NH_CONFIG_DIR, `${app.id}_config`);
      this.writeFile(nhConfigPath, obj.nocalhostConfig || "");
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
      vscode.TreeItemCollapsibleState.Collapsed
    );

    treeItem.contextValue = `kubeconfig${
      this.clusterSource === ClusterSource.local ? "-local" : ""
    }`;

    return Promise.resolve(treeItem);
  }

  private writeFile(filePath: string, writeData: string) {
    if (isExistSync(filePath)) {
      const data = fs.readFileSync(filePath).toString();
      if (data === writeData) {
        return;
      }
    }
    fs.writeFileSync(filePath, writeData, { mode: 0o600 });
  }

  getNodeStateId(): string {
    return `${this.id}${this.parent.getNodeStateId()}${ID_SPLIT}${this.label}`;
  }

  getParent(): NocalhostRootNode {
    return this.parent;
  }
}
