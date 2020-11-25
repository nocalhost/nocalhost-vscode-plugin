import * as vscode from "vscode";
import { getApplication } from "../api";
import { SELECTED_APP_NAME } from "../constants";
import { getResourceList } from "../ctl/kubectl";
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
import application from "../commands/application";

export interface BaseNocalhostNode {
  label: string;
  type: string;
  getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>>;
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem>;
}

export class LoginNode implements BaseNocalhostNode {
  label = "sign in nocalhost";
  type = LOGIN;
  getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    return Promise.resolve([]);
  }
  getTreeItem() {
    let treeItem = new vscode.TreeItem(
      this.label,
      vscode.TreeItemCollapsibleState.None
    );
    treeItem.command = { command: "showLogin", title: "showLogin" };
    return treeItem;
  }
}

abstract class NocalhostFolderNode implements BaseNocalhostNode {
  abstract label: string;
  abstract type: string;
  abstract getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>>;
  abstract getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem>;
}

export abstract class WorkloadSubFolderNode extends NocalhostFolderNode {}

export abstract class KubernetesResourceNode implements BaseNocalhostNode {
  abstract label: string;
  abstract type: string;
  abstract resourceType: string;
  abstract name: string;
  abstract info?: any;
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
    let treeItem = new vscode.TreeItem(
      this.label,
      vscode.TreeItemCollapsibleState.Collapsed
    );
    return treeItem;
  }
}

export class AppNode implements BaseNocalhostNode {
  public type = APP;
  public label: string;
  public id: number;
  public devSpaceId: number;
  public status: number;
  public installStatus: number;
  public kubeConfig: string;
  public info?: any;
  constructor(
    label: string,
    id: number,
    devSpaceId: number,
    status: number,
    installStatus: number,
    kubeConfig: string,
    info?: any
  ) {
    this.label = label;
    this.id = id;
    this.devSpaceId = devSpaceId;
    this.status = status;
    this.installStatus = installStatus;
    this.kubeConfig = kubeConfig;
    this.info = info;
  }
  getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    return Promise.resolve([]);
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    this.customLabel();
    const treeItem = new vscode.TreeItem(
      this.label,
      vscode.TreeItemCollapsibleState.None
    );
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

  private customLabel() {
    const selectAppName = fileStore.get(SELECTED_APP_NAME);
    const isSelected = selectAppName === this.info.name;
    if (isSelected) {
      this.label = `* ${this.label}`;
    }
    if (this.installStatus) {
      this.label = `${this.label} (deployed)`;
    }
  }
}

export class AppFolderNode extends NocalhostFolderNode {
  public label: string = "Applications";
  public type = APP_FOLDER;
  async getChildren(parent?: BaseNocalhostNode): Promise<AppSubFolderNode[]> {
    const res = await getApplication();
    // TODO: res.kubeconfig 为空，无法拿到下一级的数据
    const result = res.map((app) => {
      let context = app.context;
      let label: string = "";
      if (context) {
        let jsonObj = JSON.parse(context);
        label = jsonObj.application_name;
      }
      return new AppSubFolderNode(label);
    });

    const appName = fileStore.get(SELECTED_APP_NAME);
    console.log(222, appName, result);
    // if (!appName) {
    //   await application.useApplication(result[0]);
    // }

    return result;

    // const res = await getApplication();
    // const result = res.map(app => {
    //   let context = app.context;
    //   let obj: {
    //     url?: string;
    //     name?: string;
    //   } = {};
    //   if (context) {
    //     let jsonObj = JSON.parse(context);
    //     obj.url = jsonObj['application_url'];
    //     obj.name = jsonObj['application_name'];
    //   }

    //   return new AppNode(obj.name || `app${app.id}`, app.id, app.devspaceId, app.status, app.installStatus, app.kubeconfig, obj);
    // });

    // const appName = fileStore.get(SELECTED_APP_NAME);
    // if (!appName) {
    //   await application.useApplication(result[0]);
    // }

    // return result;
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let treeItem = new vscode.TreeItem(
      this.label,
      vscode.TreeItemCollapsibleState.Collapsed
    );
    return treeItem;
  }

  onDidExpandElement() {}
}

export class AppSubFolderNode extends NocalhostFolderNode {
  public label: string = "";
  public type = APP_SUB_FOLDER;
  private children = ["Workloads", "Networks"];
  constructor(label: string) {
    super();
    this.label = label;
  }
  getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    return Promise.resolve(this.children.map((type) => this.createChild(type)));
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let treeItem = new vscode.TreeItem(
      this.label,
      vscode.TreeItemCollapsibleState.Collapsed
    );
    return treeItem;
  }

  createChild(type: string) {
    let node: WorkloadFolderNode | NetworkFolderNode;
    switch (type) {
      case "Workloads":
        node = new WorkloadFolderNode();
        break;
      case "Networks":
        node = new NetworkFolderNode();
        break;
      default:
        throw new Error("not implement the resource");
    }
    return node;
  }
}

// NETWORKS
export class NetworkFolderNode extends NocalhostFolderNode {
  public label: string = "Networks";
  public type = NETWORK_FOLDER;
  private children = ["Services"];
  getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<NetworkSubFolderNode[]>> {
    return Promise.resolve(
      this.children.map((type) => this.createNetworkNode(type))
    );
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let treeItem = new vscode.TreeItem(
      this.label,
      vscode.TreeItemCollapsibleState.Collapsed
    );
    return treeItem;
  }

  createNetworkNode(type: string): NetworkSubFolderNode {
    let node;
    switch (type) {
      case "Services":
        node = new ServiceFolder();
        break;
      default:
        node = new ServiceFolder();
        break;
    }

    return node;
  }
}

export abstract class NetworkSubFolderNode extends NocalhostFolderNode {}

export class Service extends KubernetesResourceNode {
  type = SERVICE;
  public resourceType = "Service";
  constructor(public label: string, public name: string, public info?: any) {
    super();
    this.label = label;
    this.info = info;
    this.name = name;
  }
}

export class ServiceFolder extends KubernetesResourceFolder {
  public label: string = "Services";
  public type = SERVICE_FOLDER;
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await getResourceList(host, "Services");
    const list = JSON.parse(res as string) as List;
    const result: Service[] = list.items.map(
      (item) => new Service(item.metadata.name, item.metadata.name, item)
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

  getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<WorkloadSubFolderNode[]>> {
    return Promise.resolve(this.children.map((type) => this.createChild(type)));
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let treeItem = new vscode.TreeItem(
      this.label,
      vscode.TreeItemCollapsibleState.Collapsed
    );
    return treeItem;
  }

  createChild(type: string) {
    let node: WorkloadSubFolderNode;
    switch (type) {
      case "Deployments":
        node = new DeploymentFolder();
        break;
      case "StatefuleSets":
        node = new StatefulSetFolder();
        break;
      case "DaemonSets":
        node = new DaemonSetFolder();
        break;
      case "Jobs":
        node = new JobFolder();
        break;
      case "CronJobs":
        node = new CronJobFolder();
        break;
      case "Pods":
        node = new PodFolder();
        break;
      default:
        throw new Error("not implement the resource");
    }

    return node;
  }
}

export class DeploymentFolder extends KubernetesResourceFolder {
  public label: string = "Deployments";
  public type: string = DEPLOYMENT_FOLDER;
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<Deployment[]>> {
    const res = await getResourceList(host, "Deployments");
    const list = JSON.parse(res as string) as List;
    const result: Deployment[] = list.items.map(
      (item) => new Deployment(item.metadata.name, item.metadata.name, item)
    );

    return result;
  }
}

export abstract class ControllerResourceNode extends KubernetesResourceNode {
  getTreeItem(): vscode.TreeItem {
    let treeItem = super.getTreeItem();
    const appName = fileStore.get(SELECTED_APP_NAME);
    const isDebug = state.get(`${appName}_${this.name}_debug`);
    if (isDebug) {
      treeItem.label = `(Debugging) ${treeItem.label || this.label}`;
    }
    treeItem.contextValue = `workload-${this.resourceType}`;
    return treeItem;
  }
}

export class Deployment extends ControllerResourceNode {
  public type = DEPLOYMENT;
  public resourceType = "deployment";
  constructor(public label: string, public name: string, public info?: any) {
    super();
    this.label = label;
    this.info = info;
    this.name = name;
  }
}

export class StatefulSet extends ControllerResourceNode {
  public type = STATEFUL_SET;
  public resourceType = "statefulSet";
  constructor(public label: string, public name: string, public info?: any) {
    super();
    this.label = label;
    this.info = info;
    this.name = name;
  }
}

export class DaemonSet extends ControllerResourceNode {
  public type = DAEMON_SET;
  public resourceType = "daemonSet";
  constructor(public label: string, public name: string, public info?: any) {
    super();
    this.label = label;
    this.info = info;
    this.name = name;
  }
}

export class Job extends ControllerResourceNode {
  public type = JOB;
  public resourceType = "job";
  constructor(public label: string, public name: string, public info?: any) {
    super();
    this.label = label;
    this.info = info;
    this.name = name;
  }
}

export class CronJob extends ControllerResourceNode {
  public type = CRON_JOB;
  public resourceType = "cronJob";
  constructor(public label: string, public name: string, public info?: any) {
    super();
    this.label = label;
    this.info = info;
    this.name = name;
  }
}

export class Pod extends KubernetesResourceNode {
  public type = POD;
  public resourceType = "pod";
  constructor(public label: string, public name: string, public info?: any) {
    super();
    this.label = label;
    this.info = info;
    this.name = name;
  }
}

export class StatefulSetFolder extends KubernetesResourceFolder {
  public label: string = "StatefulSets";
  public type: string = STATEFUL_SET_FOLDER;
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await getResourceList(host, "StatefulSets");
    const list = JSON.parse(res as string) as List;
    const result: StatefulSet[] = list.items.map(
      (item) => new StatefulSet(item.metadata.name, item.metadata.name, item)
    );

    return result;
  }
}

export class DaemonSetFolder extends KubernetesResourceFolder {
  public label: string = "DaemonSets";
  public type: string = DAEMON_SET_FOLDER;
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await getResourceList(host, "DaemonSets");
    const list = JSON.parse(res as string) as List;
    const result: DaemonSet[] = list.items.map(
      (item) => new DaemonSet(item.metadata.name, item.metadata.name, item)
    );

    return result;
  }
}

export class JobFolder extends KubernetesResourceFolder {
  public label: string = "Jobs";
  public type: string = JOBS_FOLDER;
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await getResourceList(host, "Jobs");
    const list = JSON.parse(res as string) as List;
    const result: Job[] = list.items.map(
      (item) => new Job(item.metadata.name, item.metadata.name, item)
    );

    return result;
  }
}

export class CronJobFolder extends KubernetesResourceFolder {
  public label: string = "CronJobs";
  public type: string = CRON_JOBS_FOLDER;
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await getResourceList(host, "CronJobs");
    const list = JSON.parse(res as string) as List;
    const result: CronJob[] = list.items.map(
      (item) => new CronJob(item.metadata.name, item.metadata.name, item)
    );

    return result;
  }
}

export class PodFolder extends KubernetesResourceFolder {
  public label: string = "Pods";
  public type: string = PODS_FOLDER;
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await getResourceList(host, "Pods");
    const list = JSON.parse(res as string) as List;
    const result: Pod[] = list.items.map(
      (item) => new Pod(item.metadata.name, item.metadata.name, item)
    );

    return result;
  }
}

export class NocalhostRootNode implements BaseNocalhostNode {
  public label: string = "Nocalhost";
  public type = ROOT;
  private children = ["Applications"];
  getChildren(): Promise<vscode.ProviderResult<NocalhostFolderNode[]>> {
    return Promise.resolve(this.children.map((type) => this.createChild(type)));
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return {};
  }

  private createChild(type: string) {
    let folderNode: NocalhostFolderNode;
    switch (type) {
      case "Applications":
        folderNode = new AppFolderNode();
        break;
      default:
        folderNode = new AppFolderNode();
    }

    return folderNode;
  }
}
