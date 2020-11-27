import * as vscode from "vscode";
import { getApplication } from "../api";
import { SELECTED_APP_NAME } from "../constants";
import { getResourceList } from "../ctl/kubectl";
import { v4 as uuidv4 } from "uuid";
import host from "../host";
import state from "../state";
import * as fileStore from "../store/fileStore";
import {
  APP,
  APP_FOLDER,
  APP_SUB_FOLDER,
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
import { List } from "./resourceType";

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
  getNodeStateId() {
    const parentStateId = this.parent.getNodeStateId();
    return `${parentStateId}_${this.label}`;
  }
  abstract parent: BaseNocalhostNode;
  abstract label: string;
  abstract type: string;

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
  getTreeItem(): vscode.TreeItem {
    let treeItem = new vscode.TreeItem(
      this.label,
      vscode.TreeItemCollapsibleState.None
    );
    treeItem.label = `${this.label} (${
      this.info && JSON.stringify(this.info.status)
    })`;
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
  getNodeStateId() {
    return `app_${this.id}`;
  }
  public label: string;
  public type = APP_SUB_FOLDER;
  public id: number;
  public devSpaceId: number;
  public status: number;
  public installStatus: number;
  public kubeConfig: string;
  public info?: any;
  public parent: NocalhostRootNode;
  constructor(
    parent: NocalhostRootNode,
    label: string,
    id: number,
    devSpaceId: number,
    status: number,
    installStatus: number,
    kubeConfig: string,
    info?: any
  ) {
    super();
    this.parent = parent;
    this.label = label;
    this.id = id;
    this.devSpaceId = devSpaceId;
    this.status = status;
    this.installStatus = installStatus;
    this.kubeConfig = kubeConfig;
    this.info = info;
  }
  private children = ["Workloads", "Networks"];

  getParent(element: BaseNocalhostNode): NocalhostRootNode {
    return this.parent;
  }
  getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    return Promise.resolve(this.children.map((type) => this.createChild(type)));
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    const collapseState =
      state.get(this.getNodeStateId()) ||
      vscode.TreeItemCollapsibleState.Collapsed;
    let treeItem = new vscode.TreeItem(this.label, collapseState);
    this.customUI(treeItem);
    treeItem.id = uuidv4();
    treeItem.contextValue = `application-${
      this.installStatus === 1 ? "installed" : "notInstalled"
    }`;
    treeItem.command = {
      command: "Nocalhost.loadResource",
      title: "loadResource",
      arguments: [this],
    };
    return treeItem;
  }

  private customUI(treeItem: vscode.TreeItem) {
    if (this.installStatus) {
      treeItem.iconPath = new vscode.ThemeIcon("vm-active");
    } else {
      treeItem.iconPath = new vscode.ThemeIcon("vm-outline");
    }
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
  getNodeStateId() {
    const parentStateId = this.parent.getNodeStateId();
    return `${parentStateId}_${this.name}`;
  }
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
}

export class ServiceFolder extends KubernetesResourceFolder {
  getNodeStateId() {
    const parentStateId = this.parent.getNodeStateId();
    return `${parentStateId}_${this.label}`;
  }
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
  }
  public label: string = "Services";
  public type = SERVICE_FOLDER;
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await getResourceList(host, "Services");
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
    const res = await getResourceList(host, "Deployments");
    const list = JSON.parse(res as string) as List;
    const result: Deployment[] = list.items.map(
      (item) =>
        new Deployment(this, item.metadata.name, item.metadata.name, item)
    );

    return result;
  }
}

export abstract class ControllerResourceNode extends KubernetesResourceNode {
  getNodeStateId() {
    const parentStateId = this.parent.getNodeStateId();
    return `${parentStateId}_${this.name}`;
  }
  getTreeItem(): vscode.TreeItem {
    let treeItem = super.getTreeItem();
    const appName = fileStore.get(SELECTED_APP_NAME);
    const isDebug = state.get(`${appName}_${this.name}_devSpace`);
    if (isDebug) {
      treeItem.label = `(Launching) ${treeItem.label || this.label}`;
    }
    treeItem.contextValue = `workload-${this.resourceType}`;
    return treeItem;
  }
}

export class Deployment extends ControllerResourceNode {
  public type = DEPLOYMENT;
  public resourceType = "deployment";
  constructor(
    public parent: BaseNocalhostNode,
    public label: string,
    public name: string,
    public info?: any
  ) {
    super();
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
  getNodeStateId() {
    const parentStateId = this.parent.getNodeStateId();
    return `${parentStateId}_${this.name}`;
  }

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
    const res = await getResourceList(host, "StatefulSets");
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
    const res = await getResourceList(host, "DaemonSets");
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
    const res = await getResourceList(host, "Jobs");
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
    const res = await getResourceList(host, "CronJobs");
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
    const res = await getResourceList(host, "Pods");
    const list = JSON.parse(res as string) as List;
    const result: Pod[] = list.items.map(
      (item) => new Pod(this, item.metadata.name, item.metadata.name, item)
    );

    return result;
  }
}

export class NocalhostRootNode implements BaseNocalhostNode {
  constructor(public parent: BaseNocalhostNode | null) {}
  getNodeStateId() {
    return "Nocalhost";
  }
  public label: string = "Nocalhost";
  public type = ROOT;

  getParent(element: BaseNocalhostNode): BaseNocalhostNode | null | undefined {
    return;
  }
  async getChildren(parent?: BaseNocalhostNode): Promise<AppFolderNode[]> {
    const res = await getApplication();
    const result = res.map((app) => {
      let context = app.context;
      let obj: {
        url?: string;
        name?: string;
      } = {};
      if (context) {
        let jsonObj = JSON.parse(context);
        obj.url = jsonObj["application_url"];
        obj.name = jsonObj["application_name"];
      }
      return new AppFolderNode(
        this,
        obj.name || `app${app.id}`,
        app.id,
        app.devspaceId,
        app.status,
        app.installStatus,
        app.kubeconfig,
        obj
      );
    });

    state.set("applicationList", result);
    return result;
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let treeItem = new vscode.TreeItem(
      this.label,
      vscode.TreeItemCollapsibleState.Expanded
    );
    return treeItem;
  }
}
