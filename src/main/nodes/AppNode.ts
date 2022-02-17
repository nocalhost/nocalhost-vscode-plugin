import vscode from "vscode";
import { HELM_NH_CONFIG_DIR } from "../constants";
import * as nhctl from "../ctl/nhctl";
import yaml from "yaml";
import state from "../state";

import { ID_SPLIT } from "./nodeContants";
import { resolveVSCodeUri } from "../utils/fileUtil";
import path from "path";
import { BaseNocalhostNode, AppInfo } from "./types/nodeType";
import { NocalhostFolderNode } from "./abstract/NocalhostFolderNode";
import { NetworkFolderNode } from "./networks/NetworkFolderNode";
import { NocalhostAccountNode } from "./NocalhostAccountNode";
import { WorkloadFolderNode } from "./workloads/WorkloadFolderNode";
import { ConfigurationFolderNode } from "./configurations/ConfigurationFolderNode";
import { StorageFolder } from "./storage/StorageFolder";
import { IApplicationInfo, IV2ApplicationInfo } from "../domain";
import ConfigService, { NocalhostConfig } from "../service/configService";
import { NodeType } from "./interfact";
import { DevSpaceNode } from "./DevSpaceNode";
import { ClusterSource } from "../common/define";
import { CrdFolder } from "./customerResources/CrdFolder";

export class AppNode extends NocalhostFolderNode {
  public label: string;
  public type = NodeType.appFolder;
  public id: number;
  public devSpaceId: number;
  public status: number;
  public installStatus: number;
  public installType: string;
  public appConfig: string;
  public helmNHConfig: string;
  public kubeConfig: string;
  public resourceDir: Array<string>;
  public info: IV2ApplicationInfo | IApplicationInfo;
  public parent: BaseNocalhostNode;
  private nhctlAppInfo: AppInfo | undefined;
  private nocalhostConfig: NocalhostConfig | undefined;
  constructor(
    parent: BaseNocalhostNode,
    installType: string,
    resourceDir: Array<string>,
    label: string,
    appConfig: string,
    helmNHConfig: string,
    id: number,
    devSpaceId: number,
    status: number,
    installStatus: number,
    kubeConfig: string,
    info: IV2ApplicationInfo | IApplicationInfo // api info
  ) {
    super();
    this.installType = installType;
    this.resourceDir = resourceDir;
    this.parent = parent;
    this.label = label;
    this.appConfig = appConfig;
    this.helmNHConfig = helmNHConfig;
    this.id = id;
    this.devSpaceId = devSpaceId;
    this.status = status;
    this.installStatus = installStatus;
    this.kubeConfig = kubeConfig;
    this.info = info;
  }

  private getDefaultChildrenNodes(): string[] {
    return this.unInstalled()
      ? []
      : [
          "Workloads",
          "CustomResources",
          "Networks",
          "Configurations",
          "storage",
        ];
  }

  get context() {
    let context = this.info.context;
    let jsonObj = JSON.parse(context);
    return jsonObj;
  }

  get name() {
    return this.context["applicationName"];
  }

  get url() {
    return this.context["applicationUrl"];
  }

  get namespace() {
    const devSpace = this.parent as DevSpaceNode;
    return devSpace.info.namespace;
  }

  public async getNocalhostConfig() {
    if (this.nocalhostConfig) {
      return this.nocalhostConfig;
    }
    return this.freshNocalhostConfig();
  }

  public async freshNocalhostConfig() {
    this.nocalhostConfig = await ConfigService.getAppConfig<NocalhostConfig>(
      this.getKubeConfigPath(),
      this.namespace,
      this.name
    );
    return this.nocalhostConfig;
  }

  private updateIcon(treeItem: vscode.TreeItem) {
    if (this.unInstalling() || this.installing() || this.upgrading()) {
      return (treeItem.iconPath = resolveVSCodeUri("loading.gif"));
    }
    if (this.installed()) {
      return (treeItem.iconPath = resolveVSCodeUri("app_connected.svg"));
    }
    if (this.unInstalled()) {
      return (treeItem.iconPath = resolveVSCodeUri("app_inactive.svg"));
    }
  }

  private updateContext(treeItem: vscode.TreeItem) {
    treeItem.contextValue = "application";
    if (this.name === "default.application") {
      treeItem.contextValue = `${treeItem.contextValue}-default`;
    } else {
      treeItem.contextValue = `${treeItem.contextValue}-nodefault`;
    }
    if (this.unInstalled() && !this.unInstalling() && !this.installing()) {
      treeItem.contextValue = `${treeItem.contextValue}-notInstalled`;
    }
    if (this.installed() && !this.unInstalling() && !this.installing()) {
      treeItem.contextValue = `${treeItem.contextValue}-installed`;
    }
    if (["helmGit", "helmRepo", "helmLocal"].includes(this.installType)) {
      treeItem.contextValue = `${treeItem.contextValue}-helm`;
    }

    const devSpace = this.getParent() as DevSpaceNode;
    if (devSpace.clusterSource === ClusterSource.server) {
      treeItem.contextValue = `${treeItem.contextValue}-server`;
    }

    const devSpaceNode = this.getParent() as DevSpaceNode;

    treeItem.contextValue = devSpaceNode.getSpaceOwnTypeContextValue(
      treeItem.contextValue
    );
  }

  public getKubeConfigPath() {
    const devSpace = this.getParent() as DevSpaceNode;
    return devSpace.getKubeConfigPath();
  }

  public getHelmHNConfigPath() {
    const kubeconfigPath = path.resolve(
      HELM_NH_CONFIG_DIR,
      `${this.id}_config`
    );
    return path.normalize(kubeconfigPath);
  }

  getChildren(parent?: BaseNocalhostNode): BaseNocalhostNode[] {
    if (this.installing() || this.unInstalling()) {
      return [];
    }

    const children: string[] = this.getDefaultChildrenNodes();
    return children.map((type) => this.createChild(type));
  }

  async getTreeItem() {
    this.installStatus = 1;

    const collapsibleState =
      this.installing() || this.unInstalling()
        ? vscode.TreeItemCollapsibleState.None
        : vscode.TreeItemCollapsibleState.Collapsed;

    let treeItem = new vscode.TreeItem(this.label, collapsibleState);

    this.updateIcon(treeItem);
    this.updateContext(treeItem);
    return treeItem;
  }

  updateSyncStatus() {
    if (!this.installed()) {
      return;
    }
  }

  installed(): boolean {
    return this.installStatus === 1;
  }

  unInstalled(): boolean {
    return this.installStatus === 0;
  }

  installing(): boolean {
    return !!state.getAppState(this.getNodeStateId(), "installing");
  }

  unInstalling(): boolean {
    return !!state.getAppState(this.getNodeStateId(), "uninstalling");
  }

  upgrading(): boolean {
    return !!state.getAppState(this.getNodeStateId(), "upgrading");
  }

  getNodeStateId(): string {
    return `${this.parent.getNodeStateId()}${ID_SPLIT}${this.label}`;
  }

  getParent(): BaseNocalhostNode {
    return this.parent;
  }

  async siblings(): Promise<(AppNode | NocalhostAccountNode)[]> {
    return [];
  }

  createChild(type: string) {
    let node: BaseNocalhostNode;
    switch (type) {
      case "Workloads":
        node = new WorkloadFolderNode(this);
        break;
      case "CustomResources":
        node = new CrdFolder(this);
        break;
      case "Networks":
        node = new NetworkFolderNode(this);
        break;
      case "Configurations":
        node = new ConfigurationFolderNode(this);
        break;
      case "storage":
        node = new StorageFolder(this);
        break;
      default:
        throw new Error("not implement the resource");
    }
    return node;
  }
}
