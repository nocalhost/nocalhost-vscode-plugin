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

export class KubeConfigNode extends NocalhostFolderNode {
  public label: string;
  public type = "KUBECONFIG";
  public devspaceInfos: DevspaceInfo[];
  public userInfo: IUserInfo;
  public kubeConfig: string;
  public applications: Array<V2ApplicationInfo>;
  public parent: NocalhostRootNode;
  public installedApps: {
    name: string;
    type: string;
  }[] = [];
  public id: string;
  public isLocal: boolean;
  public localPath: string;
  public accountClusterService: AccountClusterService;
  constructor(
    id: string,
    parent: NocalhostRootNode,
    label: string,
    devspaceInfos: DevspaceInfo[],
    applications: Array<V2ApplicationInfo>,
    kubeConfig: string,
    isLocal = false,
    localPath: string,
    userInfo: IUserInfo,
    accountClusterService: AccountClusterService
  ) {
    super();
    this.id = id;
    this.parent = parent;
    this.label =
      label || (devspaceInfos.length > 0 ? devspaceInfos[0].namespace : "");
    this.devspaceInfos = devspaceInfos;
    this.applications = applications;
    this.installedApps = [];
    this.kubeConfig = kubeConfig;
    this.isLocal = isLocal;
    this.localPath = localPath;
    this.userInfo = userInfo;
    this.accountClusterService = accountClusterService;
    state.setNode(this.getNodeStateId(), this);
  }
  updateData(): any {
    return [];
  }

  public getKubeConfigPath() {
    return this.localPath;
  }

  async getChildren(parent?: BaseNocalhostNode): Promise<BaseNocalhostNode[]> {
    let res = {
      devSpaces: this.devspaceInfos,
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
        this.isLocal
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

    treeItem.contextValue = `kubeconfig${this.isLocal ? "-local" : ""}`;

    return Promise.resolve(treeItem);
  }

  private writeFile(filePath: string, writeData: string) {
    const isExist = fs.existsSync(filePath);
    if (isExist) {
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
