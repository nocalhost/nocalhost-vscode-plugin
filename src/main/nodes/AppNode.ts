import * as vscode from "vscode";
import { KUBE_CONFIG_DIR, HELM_NH_CONFIG_DIR } from "../constants";
import * as nhctl from "../ctl/nhctl";
import * as yaml from "yaml";
import state from "../state";

import { APP_FOLDER, ID_SPLIT } from "./nodeContants";
import { resolveVSCodeUri } from "../utils/fileUtil";
import * as path from "path";
import { BaseNocalhostNode, AppInfo, CurrentAppStatus } from "./types/nodeType";
import { NocalhostFolderNode } from "./abstract/NocalhostFolderNode";
import { NetworkFolderNode } from "./networks/NetworkFolderNode";
import { NocalhostRootNode } from "./NocalhostRootNode";
import { NocalhostAccountNode } from "./NocalhostAccountNode";
import { WorkloadFolderNode } from "./workloads/WorkloadFolderNode";
import { ConfigurationFolderNode } from "./configurations/ConfigurationFolderNode";
import { StorageFolder } from "./storage/StorageFolder";
import { ApplicationInfo } from "../api";
import host from "../host";
import { SYNC_SERVICE } from "../commands/constants";

export class AppNode extends NocalhostFolderNode {
  public label: string;
  public type = APP_FOLDER;
  public id: number;
  public devSpaceId: number;
  public status: number;
  public installStatus: number;
  public installType: string;
  public appConfig: string;
  public helmNHConfig: string;
  public kubeConfig: string;
  public resourceDir: Array<string>;
  public info: ApplicationInfo;
  public parent: NocalhostRootNode;
  private nhctlAppInfo: AppInfo | undefined;
  private currentAppStatus: CurrentAppStatus | undefined;
  constructor(
    parent: NocalhostRootNode,
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
    info: ApplicationInfo // api info
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
      : ["Workloads", "Networks", "Configurations", "storage"];
  }

  get context() {
    let context = this.info.context;
    let jsonObj = JSON.parse(context);
    return jsonObj;
  }

  get name() {
    return this.context["application_name"];
  }

  get url() {
    return this.context["application_url"];
  }

  get namespace() {
    return this.info.namespace;
  }

  public async getApplicationInfo() {
    if (this.nhctlAppInfo) {
      return this.nhctlAppInfo;
    }
    return this.freshApplicationInfo();
  }

  public async getCurrentAppStatus() {
    if (this.currentAppStatus) {
      return this.currentAppStatus;
    }
    return this.freshCurrentAppStatus();
  }

  public async freshCurrentAppStatus() {
    let info = {} as CurrentAppStatus;
    const infoStr = await nhctl
      .loadResource(host, this.name)
      .catch((err) => {});
    if (infoStr) {
      info = yaml.parse(infoStr as string);
    }
    this.currentAppStatus = info;
    return this.currentAppStatus;
  }

  public async freshApplicationInfo() {
    let info = {} as AppInfo;
    const infoStr = await nhctl.getAppInfo(this.name).catch((err) => {});
    if (infoStr) {
      info = yaml.parse(infoStr as string);
    }
    this.nhctlAppInfo = info;
    return this.nhctlAppInfo;
  }

  private updateIcon(treeItem: vscode.TreeItem) {
    if (this.installed() && !this.unInstalling()) {
      return (treeItem.iconPath = resolveVSCodeUri("app-connected.svg"));
    }
    if (this.unInstalled() && !this.installing()) {
      return (treeItem.iconPath = resolveVSCodeUri("app-inactive.svg"));
    }
    treeItem.iconPath = resolveVSCodeUri("loading.svg");
  }

  private updateContext(treeItem: vscode.TreeItem) {
    if (this.unInstalled() && !this.unInstalling() && !this.installing()) {
      treeItem.contextValue = "application-notInstalled";
    }
    if (this.installed() && !this.unInstalling() && !this.installing()) {
      treeItem.contextValue = "application-installed";
    }
    if (["helmGit", "helmRepo"].includes(this.installType)) {
      treeItem.contextValue += `${treeItem.contextValue}-helm`;
    }
  }

  public getKubeConfigPath() {
    const kubeconfigPath = path.resolve(
      KUBE_CONFIG_DIR,
      `${this.id}_${this.devSpaceId}_config`
    );

    return path.normalize(kubeconfigPath);
  }

  public getHelmHNConfigPath() {
    const kubeconfigPath = path.resolve(
      HELM_NH_CONFIG_DIR,
      `${this.id}_${this.devSpaceId}_config`
    );
    return path.normalize(kubeconfigPath);
  }

  getChildren(parent?: BaseNocalhostNode): BaseNocalhostNode[] {
    const children: string[] = this.getDefaultChildrenNodes();
    return children.map((type) => this.createChild(type));
  }

  async getTreeItem() {
    const info = await this.getApplicationInfo();
    this.installStatus = info.installed ? 1 : 0;
    if (info.installed) {
      await this.getCurrentAppStatus();
    }
    let collapseState: vscode.TreeItemCollapsibleState;
    if (this.unInstalled()) {
      collapseState = vscode.TreeItemCollapsibleState.None;
    } else {
      collapseState =
        state.get(this.getNodeStateId()) ||
        vscode.TreeItemCollapsibleState.Collapsed;
    }
    let treeItem = new vscode.TreeItem(this.label, collapseState);
    this.updateIcon(treeItem);
    this.updateContext(treeItem);
    // treeItem.command = {
    //   command: "Nocalhost.loadResource",
    //   title: "loadResource",
    //   arguments: [this],
    // };
    this.updateSyncStatus();
    return treeItem;
  }

  updateSyncStatus() {
    if (!this.installed()) {
      return;
    }
    const svcProfiles =
      (this.nhctlAppInfo && this.nhctlAppInfo.svcProfile) || [];
    for (const service of svcProfiles) {
      if (
        service.developing &&
        service.localAbsoluteSyncDirFromDevStartPlugin.length > 0 &&
        service.localAbsoluteSyncDirFromDevStartPlugin[0] ===
          host.getCurrentRootPath()
      ) {
        vscode.commands.executeCommand(SYNC_SERVICE, {
          app: this.name,
          service: service.name,
        });
        break;
      }
    }
  }

  installed(): boolean {
    return this.installStatus === 1;
  }

  unInstalled(): boolean {
    return this.installStatus === 0;
  }

  installing(): boolean {
    return !!state.getAppState(this.label, "installing");
  }

  unInstalling(): boolean {
    return !!state.getAppState(this.label, "uninstalling");
  }

  getNodeStateId(): string {
    return `${this.parent.getNodeStateId()}${ID_SPLIT}${this.label}`;
  }

  getParent(): NocalhostRootNode {
    return this.parent;
  }

  async siblings(): Promise<(AppNode | NocalhostAccountNode)[]> {
    return (await this.parent.getChildren()).filter((item) => {
      return item instanceof AppNode && item.id !== this.id;
    });
  }

  collapsis(): void {
    state.set(this.getNodeStateId(), vscode.TreeItemCollapsibleState.Collapsed);
  }

  expanded(): void {
    state.set(this.getNodeStateId(), vscode.TreeItemCollapsibleState.Expanded);
  }

  expandWorkloadNode(): void {
    state.set(
      `${this.getNodeStateId()}${ID_SPLIT}Workloads`,
      vscode.TreeItemCollapsibleState.Expanded
    );
  }

  createChild(type: string) {
    let node: BaseNocalhostNode;
    switch (type) {
      case "Workloads":
        node = new WorkloadFolderNode(this);
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
