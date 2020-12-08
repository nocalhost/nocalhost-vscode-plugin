import * as vscode from "vscode";
import { getApplication } from "../api";
import { KUBE_CONFIG_DIR, USERINFO } from "../constants";
import * as kubectl from "../ctl/kubectl";
import { loadResource } from "../ctl/nhctl";
import * as yaml from "yaml";
import { v4 as uuidv4 } from "uuid";
import host from "../host";
import state from "../state";
import * as fileStore from "../store/fileStore";
import {
  APP,
  APP_FOLDER,
  CRON_JOB,
  CRON_JOBS_FOLDER,
  DAEMON_SET,
  DAEMON_SET_FOLDER,
  DEPLOYMENT,
  DEPLOYMENT_FOLDER,
  JOB,
  JOBS_FOLDER,
  KUBERNETE_FOLDER_RESOURCE,
  KUBERNETE_RESOURCE,
  LOGIN,
  NETWORK_FOLDER,
  POD,
  PODS_FOLDER,
  ROOT,
  SERVICE,
  SERVICE_FOLDER,
  STATEFUL_SET,
  STATEFUL_SET_FOLDER,
  WORKLOAD_FOLDER,
} from "./nodeContants";
import { List, Resource, ResourceStatus } from "./resourceType";
import application from "../commands/application";
import ConfigService from "../service/configService";
import validate from "../utils/validate";
import { resolveVSCodeUri } from "../utils/fileUtil";
import * as path from "path";

const ID_SPLIT = "*/.&|/";

interface AppInfo {
  name: string;
  namespace: string;
  kubeconfig: string;
  dependencyConfigMapName: string;
  appType: string;
  svcProfile: Array<SvcProfile>;
  installed: boolean;
  resourcePath: string;
}

interface SvcProfile {
  name: string;
  type: string;
  developing: boolean;
  portForwarded: boolean;
  syncing: boolean;
  workDir: string;
  remoteSyncthingPort: number;
  remoteSyncthingGUIPort: number;
  localSyncthingPort: number;
  localSyncthingGUIPort: number;
  localAbsoluteSyncDirFromDevStartPlugin: any;
  devPortList: Array<string>;
}

export interface BaseNocalhostNode {
  label: string;
  type: string;
  parent: BaseNocalhostNode | undefined | null;
  getNodeStateId(): string;
  getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>>;
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem>;

  getParent(element?: BaseNocalhostNode): BaseNocalhostNode | null | undefined;
}

export abstract class NocalhostFolderNode implements BaseNocalhostNode {
  abstract parent: BaseNocalhostNode;
  abstract label: string;
  abstract type: string;

  getNodeStateId(): string {
    const parentStateId = this.parent.getNodeStateId();
    return `${parentStateId}${ID_SPLIT}${this.label}`;
  }
  abstract getParent(element: BaseNocalhostNode): BaseNocalhostNode;
  abstract getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>>;
  abstract getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem>;
}

export abstract class WorkloadSubFolderNode extends NocalhostFolderNode {}

export abstract class KubernetesResourceNode implements BaseNocalhostNode {
  abstract getNodeStateId(): string;
  abstract label: string;
  abstract type: string;
  abstract resourceType: string;
  abstract name: string;
  abstract info?: any;
  abstract parent: BaseNocalhostNode;

  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    return Promise.resolve([]);
  }
  getTreeItem(): vscode.TreeItem | Promise<vscode.TreeItem> {
    let treeItem = new vscode.TreeItem(
      this.label,
      vscode.TreeItemCollapsibleState.None
    );
    treeItem.label = this.label;
    treeItem.command = {
      command: "Nocalhost.loadResource",
      title: "loadResource",
      arguments: [this],
    };
    return treeItem;
  }
}

export abstract class KubernetesResourceFolder extends WorkloadSubFolderNode {
  public abstract label: string;
  public abstract type: string;
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    const collapseState =
      state.get(this.getNodeStateId()) ||
      vscode.TreeItemCollapsibleState.Collapsed;
    let treeItem = new vscode.TreeItem(this.label, collapseState);
    return treeItem;
  }
}

export class AppFolderNode extends NocalhostFolderNode {
  public label: string;
  public type = APP_FOLDER;
  public id: number;
  public devSpaceId: number;
  public status: number;
  public installStatus: number;
  public installType: string;
  public kubeConfig: string;
  public resourceDir: string;
  public info?: any;
  public parent: NocalhostRootNode;
  private nhctlAppInfo: AppInfo | undefined;
  constructor(
    parent: NocalhostRootNode,
    installType: string,
    resourceDir: string,
    label: string,
    id: number,
    devSpaceId: number,
    status: number,
    installStatus: number,
    kubeConfig: string,
    info?: any
  ) {
    super();
    this.installType = installType;
    this.resourceDir = resourceDir;
    this.parent = parent;
    this.label = label;
    this.id = id;
    this.devSpaceId = devSpaceId;
    this.status = status;
    this.installStatus = installStatus;
    this.kubeConfig = kubeConfig;
    this.info = info;
  }

  private getDefaultChildrenNodes(): string[] {
    return this.unInstalled() ? [] : ["Workloads", "Networks"];
  }

  public async getApplicationInfo() {
    if (this.nhctlAppInfo) {
      return this.nhctlAppInfo;
    }
    return this.freshApplicationInfo();
  }

  public async freshApplicationInfo() {
    let info = {} as AppInfo;
    const infoStr = await loadResource(host, this.label).catch((err) => {});
    if (infoStr) {
      info = yaml.parse(infoStr as string);
    }
    this.nhctlAppInfo = info;
    return this.nhctlAppInfo;
  }

  private updateIcon(treeItem: vscode.TreeItem) {
    if (this.installed() && !this.unInstalling()) {
      return (treeItem.iconPath = resolveVSCodeUri(
        "images/icons/app-connected.svg"
      ));
    }
    if (this.unInstalled() && !this.installing()) {
      return (treeItem.iconPath = resolveVSCodeUri(
        "images/icons/app-inactive.svg"
      ));
    }
    treeItem.iconPath = resolveVSCodeUri("images/icons/loading.svg");
  }

  private updateContext(treeItem: vscode.TreeItem) {
    if (this.unInstalled() && !this.unInstalling() && !this.installing()) {
      treeItem.contextValue = "application-notInstalled";
    }
    if (this.installed() && !this.unInstalling() && !this.installing()) {
      treeItem.contextValue = "application-installed";
    }
    if (["helm", "helm-repo"].includes(this.installType)) {
      treeItem.contextValue += `${treeItem.contextValue}-helm`;
    }
  }

  private getKUbeconfigPath() {
    return path.resolve(
      KUBE_CONFIG_DIR,
      `${this.id}_${this.devSpaceId}_config`
    );
  }

  getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const children: string[] = this.getDefaultChildrenNodes();
    return Promise.resolve(children.map((type) => this.createChild(type)));
  }

  async getTreeItem() {
    const info = await this.getApplicationInfo();
    this.installStatus = info.installed ? 1 : 0;
    let collapseState: vscode.TreeItemCollapsibleState;
    if (this.unInstalled()) {
      collapseState = vscode.TreeItemCollapsibleState.None;
    } else {
      collapseState =
        state.get(this.getNodeStateId()) ||
        vscode.TreeItemCollapsibleState.Collapsed;
    }
    let treeItem = new vscode.TreeItem(this.label, collapseState);
    treeItem.id = uuidv4();
    this.updateIcon(treeItem);
    this.updateContext(treeItem);
    // treeItem.command = {
    //   command: "Nocalhost.loadResource",
    //   title: "loadResource",
    //   arguments: [this],
    // };
    return treeItem;
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

  async siblings(): Promise<(AppFolderNode | NocalhostAccountNode)[]> {
    return (await this.parent.getChildren()).filter((item) => {
      return item instanceof AppFolderNode && item.id !== this.id;
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
    let node: WorkloadFolderNode | NetworkFolderNode;
    switch (type) {
      case "Workloads":
        node = new WorkloadFolderNode(this);
        break;
      case "Networks":
        node = new NetworkFolderNode(this);
        break;
      default:
        throw new Error("not implement the resource");
    }
    return node;
  }
}

// NETWORKS
export class NetworkFolderNode extends NocalhostFolderNode {
  public parent: BaseNocalhostNode;
  public label: string = "Networks";
  public type = NETWORK_FOLDER;
  private children = ["Services"];

  constructor(parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<NetworkSubFolderNode[]>> {
    return Promise.resolve(
      this.children.map((type) => this.createNetworkNode(type))
    );
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    const collapseState =
      state.get(this.getNodeStateId()) ||
      vscode.TreeItemCollapsibleState.Collapsed;
    let treeItem = new vscode.TreeItem(this.label, collapseState);
    return treeItem;
  }

  createNetworkNode(type: string): NetworkSubFolderNode {
    let node;
    switch (type) {
      case "Services":
        node = new ServiceFolder(this);
        break;
      default:
        node = new ServiceFolder(this);
        break;
    }

    return node;
  }
}

export abstract class NetworkSubFolderNode extends NocalhostFolderNode {}

export class Service extends KubernetesResourceNode {
  type = SERVICE;
  public resourceType = "Service";
  constructor(
    public parent: BaseNocalhostNode,
    public label: string,
    public name: string,
    public info?: any
  ) {
    super();
    this.parent = parent;
    this.label = label;
    this.info = info;
    this.name = name;
  }
  getNodeStateId(): string {
    const parentStateId = this.parent.getNodeStateId();
    return `${parentStateId}${ID_SPLIT}${this.name}`;
  }
}

export class ServiceFolder extends KubernetesResourceFolder {
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
  }
  public label: string = "Services";
  public type = SERVICE_FOLDER;
  getNodeStateId(): string {
    const parentStateId = this.parent.getNodeStateId();
    return `${parentStateId}${ID_SPLIT}${this.label}`;
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await kubectl.getResourceList(host, "Services");
    const list = JSON.parse(res as string) as List;
    const result: Service[] = list.items.map(
      (item) => new Service(this, item.metadata.name, item.metadata.name, item)
    );
    return result;
  }
}

export class WorkloadFolderNode extends NocalhostFolderNode {
  public label: string = "Workloads";
  public type = WORKLOAD_FOLDER;
  private children = [
    "Deployments",
    "StatefuleSets",
    "DaemonSets",
    "Jobs",
    "CronJobs",
    "Pods",
  ];

  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
  }

  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<WorkloadSubFolderNode[]>> {
    return Promise.resolve(this.children.map((type) => this.createChild(type)));
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    const collapseState =
      state.get(this.getNodeStateId()) ||
      vscode.TreeItemCollapsibleState.Collapsed;
    let treeItem = new vscode.TreeItem(this.label, collapseState);
    return treeItem;
  }

  createChild(type: string) {
    let node: WorkloadSubFolderNode;
    switch (type) {
      case "Deployments":
        node = new DeploymentFolder(this);
        break;
      case "StatefuleSets":
        node = new StatefulSetFolder(this);
        break;
      case "DaemonSets":
        node = new DaemonSetFolder(this);
        break;
      case "Jobs":
        node = new JobFolder(this);
        break;
      case "CronJobs":
        node = new CronJobFolder(this);
        break;
      case "Pods":
        node = new PodFolder(this);
        break;
      default:
        throw new Error("not implement the resource");
    }

    return node;
  }
}

export class DeploymentFolder extends KubernetesResourceFolder {
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  public label: string = "Deployments";
  public type: string = DEPLOYMENT_FOLDER;
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<Deployment[]>> {
    const res = await kubectl.getResourceList(host, "Deployments");
    const list = JSON.parse(res as string) as List;
    const result: Deployment[] = list.items.map(
      (item) =>
        new Deployment(this, item.metadata.name, item.metadata.name, item)
    );
    return result;
  }
}

export abstract class ControllerResourceNode extends KubernetesResourceNode {
  getNodeStateId(): string {
    const parentStateId = this.parent.getNodeStateId();
    return `${parentStateId}${ID_SPLIT}${this.name}`;
  }
  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    treeItem.contextValue = `workload-${this.resourceType}`;
    return treeItem;
  }

  public getStatus(): string | Promise<string> {
    const appNode = this.getAppNode();
    const status = state.getAppState(
      appNode.label,
      `${this.getNodeStateId()}_status`
    );
    return status;
  }

  /**
   *
   * @param status
   * @param fresh Refresh dependencies
   */
  public async setStatus(status: string, fresh?: boolean) {
    const appNode = this.getAppNode();
    if (fresh) {
      await appNode.freshApplicationInfo();
    }
    if (status) {
      state.setAppState(
        appNode.label,
        `${this.getNodeStateId()}_status`,
        status,
        {
          refresh: true,
          node: this,
        }
      );
    } else {
      state.deleteAppState(appNode.label, `${this.getNodeStateId()}_status`, {
        refresh: true,
        node: this,
      });
    }
  }

  public getAppNode(parent?: BaseNocalhostNode): AppFolderNode {
    let node: BaseNocalhostNode | null | undefined;
    if (parent) {
      node = parent.getParent(parent);
    } else {
      node = this.getParent(this);
    }
    if (node instanceof AppFolderNode) {
      return node;
    } else {
      return this.getAppNode(node as BaseNocalhostNode);
    }
  }

  public checkConfig() {
    return Promise.resolve(true);
  }
}

export enum DeploymentStatus {
  running = "running",
  developing = "developing",
  starting = "starting",
  unknown = "unknown",
}

export class Deployment extends ControllerResourceNode {
  public type = DEPLOYMENT;
  public resourceType = "deployment";
  private firstRender = true;
  constructor(
    public parent: BaseNocalhostNode,
    public label: string,
    public name: string,
    public info?: any
  ) {
    super();
  }

  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    let status = "";
    if (this.firstRender) {
      this.firstRender = false;
      setTimeout(() => {
        vscode.commands.executeCommand("Nocalhost.refresh", this);
      }, 0);
      return treeItem;
    }
    status = await this.getStatus();
    switch (status) {
      case "running":
        treeItem.iconPath = resolveVSCodeUri("images/icons/status-normal.svg");
        break;
      case "developing":
        treeItem.iconPath = resolveVSCodeUri("images/icons/status-running.svg");
        break;
      case "starting":
        treeItem.iconPath = resolveVSCodeUri("images/icons/loading.svg");
        break;
      case "unknown":
        treeItem.iconPath = resolveVSCodeUri("images/icons/status-unknown.svg");
        break;
    }
    const check = await this.checkConfig();
    treeItem.contextValue = `${treeItem.contextValue}-${
      check ? "info" : "warn"
    }-${status}`;
    return treeItem;
  }

  public async getStatus() {
    const appNode = this.getAppNode();
    let status = state.getAppState(
      appNode.label,
      `${this.getNodeStateId()}_status`
    );
    if (status) {
      return Promise.resolve(status);
    }
    const appInfo = await appNode.getApplicationInfo();
    const svcProfile = appInfo.svcProfile;
    for (let i = 0; i < svcProfile.length; i++) {
      if (svcProfile[i].name === this.name && svcProfile[i].developing) {
        return DeploymentStatus.developing;
      }
    }
    const deploy = await kubectl.loadResource(
      host,
      this.type,
      this.name,
      "json"
    );
    const deploymentObj = JSON.parse(deploy as string) as Resource;
    const resStatus = deploymentObj.status as ResourceStatus;
    resStatus.conditions.forEach((s) => {
      if (s.type === "Available" && s.status === "True") {
        status = "running";
      }
    });
    if (!status) {
      status = "unknown";
    }
    return status;
  }

  public async checkConfig() {
    const appNode = this.getAppNode();
    const workloadConfig = await ConfigService.getWorkloadConfig(
      appNode.label,
      this.name
    );
    const schema = {
      type: "object",
      required: ["gitUrl", "devImage", "name"],
    };
    return validate(workloadConfig, schema);
  }
}

export class StatefulSet extends ControllerResourceNode {
  public type = STATEFUL_SET;
  public resourceType = "statefulSet";
  constructor(
    public parent: BaseNocalhostNode,
    public label: string,
    public name: string,
    public info?: any
  ) {
    super();
  }
}

export class DaemonSet extends ControllerResourceNode {
  public type = DAEMON_SET;
  public resourceType = "daemonSet";
  constructor(
    public parent: BaseNocalhostNode,
    public label: string,
    public name: string,
    public info?: any
  ) {
    super();
  }
}

export class Job extends ControllerResourceNode {
  public type = JOB;
  public resourceType = "job";
  constructor(
    public parent: BaseNocalhostNode,
    public label: string,
    public name: string,
    public info?: any
  ) {
    super();
  }
}

export class CronJob extends ControllerResourceNode {
  public type = CRON_JOB;
  public resourceType = "cronJob";
  constructor(
    public parent: BaseNocalhostNode,
    public label: string,
    public name: string,
    public info?: any
  ) {
    super();
  }
}

export class Pod extends KubernetesResourceNode {
  public type = POD;
  public resourceType = "pod";
  constructor(
    public parent: BaseNocalhostNode,
    public label: string,
    public name: string,
    public info?: any
  ) {
    super();
  }
  getNodeStateId(): string {
    const parentStateId = this.parent.getNodeStateId();
    return `${parentStateId}${ID_SPLIT}${this.name}`;
  }
}

export class StatefulSetFolder extends KubernetesResourceFolder {
  public label: string = "StatefulSets";
  public type: string = STATEFUL_SET_FOLDER;

  constructor(public parent: BaseNocalhostNode) {
    super();
  }

  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await kubectl.getResourceList(host, "StatefulSets");
    const list = JSON.parse(res as string) as List;
    const result: StatefulSet[] = list.items.map(
      (item) =>
        new StatefulSet(this, item.metadata.name, item.metadata.name, item)
    );

    return result;
  }
}

export class DaemonSetFolder extends KubernetesResourceFolder {
  public label: string = "DaemonSets";
  public type: string = DAEMON_SET_FOLDER;
  constructor(public parent: BaseNocalhostNode) {
    super();
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await kubectl.getResourceList(host, "DaemonSets");
    const list = JSON.parse(res as string) as List;
    const result: DaemonSet[] = list.items.map(
      (item) =>
        new DaemonSet(this, item.metadata.name, item.metadata.name, item)
    );

    return result;
  }
}

export class JobFolder extends KubernetesResourceFolder {
  constructor(public parent: BaseNocalhostNode) {
    super();
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  public label: string = "Jobs";
  public type: string = JOBS_FOLDER;
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await kubectl.getResourceList(host, "Jobs");
    const list = JSON.parse(res as string) as List;
    const result: Job[] = list.items.map(
      (item) => new Job(this, item.metadata.name, item.metadata.name, item)
    );

    return result;
  }
}

export class CronJobFolder extends KubernetesResourceFolder {
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  public label: string = "CronJobs";
  public type: string = CRON_JOBS_FOLDER;
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await kubectl.getResourceList(host, "CronJobs");
    const list = JSON.parse(res as string) as List;
    const result: CronJob[] = list.items.map(
      (item) => new CronJob(this, item.metadata.name, item.metadata.name, item)
    );

    return result;
  }
}

export class PodFolder extends KubernetesResourceFolder {
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  public label: string = "Pods";
  public type: string = PODS_FOLDER;
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await kubectl.getResourceList(host, "Pods");
    const list = JSON.parse(res as string) as List;
    const result: Pod[] = list.items.map(
      (item) => new Pod(this, item.metadata.name, item.metadata.name, item)
    );

    return result;
  }
}

export class NocalhostAccountNode implements BaseNocalhostNode {
  label: string;
  type: string = "account";
  parent: BaseNocalhostNode;

  constructor(parent: BaseNocalhostNode, label: string) {
    this.parent = parent;
    this.label = label;
  }
  getNodeStateId(): string {
    return `${this.parent.getNodeStateId()}${ID_SPLIT}${this.type}`;
  }
  getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    return Promise.resolve([]);
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let treeItem = new vscode.TreeItem(
      this.label,
      vscode.TreeItemCollapsibleState.None
    );
    treeItem.iconPath = new vscode.ThemeIcon("account");
    return treeItem;
  }
  getParent(element?: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
}

export class NocalhostRootNode implements BaseNocalhostNode {
  public label: string = "Nocalhost";
  public type = ROOT;
  constructor(public parent: BaseNocalhostNode | null) {}

  getParent(element: BaseNocalhostNode): BaseNocalhostNode | null | undefined {
    return;
  }

  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<Array<AppFolderNode | NocalhostAccountNode>> {
    const res = await getApplication();
    let result: Array<AppFolderNode | NocalhostAccountNode> = res.map((app) => {
      let context = app.context;
      let obj: {
        url?: string;
        name?: string;
        installType: string;
        resourceDir: string;
      } = {
        installType: "manifest",
        resourceDir: "manifest",
      };
      if (context) {
        let jsonObj = JSON.parse(context);
        obj.url = jsonObj["application_url"];
        obj.name = jsonObj["application_name"];
        let originInstallType = jsonObj["install_type"];
        let source = jsonObj["source"];
        obj.installType = this.generateInstallType(source, originInstallType);
        obj.resourceDir = jsonObj["resource_dir"];
      }
      application.saveKubeConfig(app.id, app.devspaceId, app.kubeconfig);
      return new AppFolderNode(
        this,
        obj.installType,
        obj.resourceDir,
        obj.name || `app${app.id}`,
        app.id,
        app.devspaceId,
        app.status,
        app.installStatus,
        app.kubeconfig,
        obj
      );
    });

    const userinfo = fileStore.get(USERINFO);

    if (result.length > 0) {
      result.unshift(new NocalhostAccountNode(this, `Hi, ${userinfo.name}`));
    }
    return result;
  }

  private generateInstallType(source: string, originInstallType: string) {
    let type = "helm-repo";

    if (source === "git" && originInstallType === "manifest") {
      type = "manifest";
    } else if (source === "git" && originInstallType === "helm_chart") {
      type = "helm";
    }
    return type;
  }

  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let treeItem = new vscode.TreeItem(
      this.label,
      vscode.TreeItemCollapsibleState.Expanded
    );
    return treeItem;
  }

  getNodeStateId(): string {
    return "Nocalhost";
  }
}
