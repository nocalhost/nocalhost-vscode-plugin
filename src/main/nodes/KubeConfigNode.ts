import * as vscode from "vscode";
import * as fs from "fs";

import { HELM_NH_CONFIG_DIR, KUBE_CONFIG_DIR } from "../constants";
import state from "../state";

import { ID_SPLIT } from "./nodeContants";
import * as path from "path";
import { BaseNocalhostNode } from "./types/nodeType";
import { NocalhostFolderNode } from "./abstract/NocalhostFolderNode";
import { NocalhostRootNode } from "./NocalhostRootNode";
import { DevspaceInfo, V2ApplicationInfo } from "../api";
import * as _ from "lodash";
import { DevSpaceNode } from "./DevSpaceNode";

export class KubeConfigNode extends NocalhostFolderNode {
  public label: string;
  public type = "KUBECONFIG";
  public devspaceInfos: DevspaceInfo[];
  public kubeConfig: string;
  public applications: Array<V2ApplicationInfo>;
  public parent: NocalhostRootNode;
  public installedApps: {
    name: string;
    type: string;
  }[] = [];
  public isLocal: boolean;
  public localPath: string;

  constructor(
    parent: NocalhostRootNode,
    label: string,
    devspaceInfos: DevspaceInfo[],
    applications: Array<V2ApplicationInfo>,
    kubeConfig: string,
    isLocal = false,
    localPath: string
  ) {
    super();
    this.parent = parent;
    this.label = label || devspaceInfos[0].namespace;
    this.devspaceInfos = devspaceInfos;
    this.applications = applications;
    this.installedApps = [];
    this.kubeConfig = kubeConfig;
    this.isLocal = isLocal;
    this.localPath = localPath;
    state.setNode(this.getNodeStateId(), this);
  }
  updateData() {
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
        obj.nocalhostConfig = jsonObj["nocalhost_config"];
      }

      const nhConfigPath = path.resolve(HELM_NH_CONFIG_DIR, `${app.id}_config`);
      this.writeFile(nhConfigPath, obj.nocalhostConfig || "");
    });

    for (const d of res.devSpaces) {
      const node = new DevSpaceNode(this, d.spaceName, d, res.applications);
      devs.push(node);
    }

    return devs;
  }

  async getTreeItem() {
    let treeItem = new vscode.TreeItem(
      this.label,
      vscode.TreeItemCollapsibleState.Collapsed
    );

    treeItem.contextValue = "kubeconfig";

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
    return `${this.parent.getNodeStateId()}${ID_SPLIT}${this.label}`;
  }

  getParent(): NocalhostRootNode {
    return this.parent;
  }
}
