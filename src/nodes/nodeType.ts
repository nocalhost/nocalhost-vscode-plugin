import * as vscode from 'vscode';
import { getApplication } from '../api';
import { SELECTED_APP_ID } from '../constants';
import { getResourceList } from '../ctl/kubectl';
import host from '../host';
import * as fileStore from '../store/fileStore';
import { APP, APP_FOLDER, CRON_JOB, CRON_JOBS_FOLDER, DAEMON_SET, DAEMON_SET_FOLDER, DEPLOYMENT, DEPLOYMENT_FOLDER, JOB, JOBS_FOLDER, KUBERNETE_FOLDER_RESOURCE, KUBERNETE_RESOURCE, LOGIN, NETWORK_FOLDER, POD, PODS_FOLDER, ROOT, SERVICE, SERVICE_FOLDER, STATEFUL_SET, STATEFUL_SET_FOLDER, WORKLOAD_FOLDER } from './nodeContants';
import { List } from './resourceType';

export interface BaseNocalhostNode {
  label: string;
  type: string;
  getChildren(parent?: BaseNocalhostNode): Promise<vscode.ProviderResult<BaseNocalhostNode[]>>;
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem>;
}

export class LoginNode implements BaseNocalhostNode {
  label = 'sign in nocalhost';
  type = LOGIN;
  getChildren(parent?: BaseNocalhostNode): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    return Promise.resolve([]);
  }
  getTreeItem() {
    let treeItem = new vscode.TreeItem(this.label, vscode.TreeItemCollapsibleState.None);
    treeItem.command = { command: 'showLogin', title: 'showLogin'};
    return treeItem;
  }
}


abstract class NocalhostFolderNode implements BaseNocalhostNode {
  abstract label: string;
  abstract type: string;
  abstract getChildren(parent?: BaseNocalhostNode): Promise<vscode.ProviderResult<BaseNocalhostNode[]>>;
  abstract getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem>;
}


export abstract class WorkloadSubFolderNode extends NocalhostFolderNode {}

export abstract class KubernetesResourceNode implements BaseNocalhostNode {
  abstract label: string;
  abstract type: string;
  abstract resourceType: string;
  abstract name: string;
  abstract info?: any;
  getChildren(parent?: BaseNocalhostNode): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    return Promise.resolve([]);
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let treeItem = new vscode.TreeItem(this.label, vscode.TreeItemCollapsibleState.None);
    return treeItem;
  }
}

export abstract class KubernetesResourceFolder extends WorkloadSubFolderNode {
  public abstract label: string;
  public abstract type: string;
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let treeItem = new vscode.TreeItem(this.label, vscode.TreeItemCollapsibleState.Collapsed);
    return treeItem;
  }
}

export class AppNode implements BaseNocalhostNode {
  public type = APP;
  public label: string;
  public id: number;
  public status: number;
  public devSpaceStatus: number;
  public info?: any;
  constructor(label: string, id: number, status: number, devSpaceStatus: number, info?: any) {
    this.label = label;
    this.id = id;
    this.status = status;
    this.devSpaceStatus = devSpaceStatus;
    this.info = info;
  }
  getChildren(parent?: BaseNocalhostNode): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    return Promise.resolve([]);
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    this.customLabel();
    const treeItem = new vscode.TreeItem(this.label, vscode.TreeItemCollapsibleState.None);
    treeItem.contextValue = `application-${this.devSpaceStatus === 1 ? 'deployed': 'notDeployed'}`;
    return treeItem;
  }

  private customLabel() {
    const selectAppId = fileStore.get(SELECTED_APP_ID);
    const isSelected = selectAppId === this.id;
    const status = fileStore.get(`app_${this.id}_status`) || false;
    if (isSelected) {
      this.label = `* ${this.label}`;
    }
    if (status) {
      this.label = `${this.label} (deployed)`;
    }
  }
}

export class AppFolderNode extends NocalhostFolderNode {
  public label: string = 'Applications';
  public type = APP_FOLDER;
  async getChildren(parent?: BaseNocalhostNode):Promise<AppNode[] | null | undefined> {
    const res = await getApplication();
    const result = res.map(app => {
      let context = app.context;
      let obj: {
        url?: string;
        name?: string;
      } = {};
      if (context) {
        let jsonObj = JSON.parse(context);
        obj.url = jsonObj['application_url'];
        obj.name = jsonObj['application_name'];
      }
    
      return new AppNode(obj.name || `app${app.id}`, app.id, app.status, app.devSpaceStatus ,{url: obj.url});
    });

    return result;
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let treeItem = new vscode.TreeItem(this.label, vscode.TreeItemCollapsibleState.Collapsed);
    treeItem.command = { command: 'showLogin', title: 'showLogin'};
    return treeItem;
  }
}

// NETWORKS
export class NetworkFolderNode extends NocalhostFolderNode {
  public label: string = 'Networks';
  public type = NETWORK_FOLDER;
  private children = ['Services'];
  getChildren(parent?: BaseNocalhostNode): Promise<vscode.ProviderResult<NetworkSubFolderNode[]>> {
    return Promise.resolve(this.children.map((type) => this.createNetworkNode(type)));
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let treeItem = new vscode.TreeItem(this.label, vscode.TreeItemCollapsibleState.Collapsed);
    return treeItem;;
  }

  createNetworkNode(type: string): NetworkSubFolderNode {
    let node;
    switch(type) {
      case 'Services':
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
  public resourceType = 'Service';
  constructor(public label: string, public name: string, public info?: any) {
    super();
    this.label = label;
    this.info = info;
    this.name = name;
  }
}

export class ServiceFolder extends KubernetesResourceFolder {
  public label: string = 'Services';
  public type = SERVICE_FOLDER;
  async getChildren(parent?: BaseNocalhostNode): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await getResourceList(host, 'Services');
    const list = JSON.parse(res as string) as List;
    const result: Service[] = list.items.map((item) => new Service(item.metadata.name, item.metadata.name, item));

    return result;
  }
}

export class WorkloadFolderNode extends NocalhostFolderNode {
  public label: string = 'Workloads';
  public type = WORKLOAD_FOLDER;
  private children = ['Deployments', 'StatefuleSets', 'DaemonSets', 'Jobs', 'CronJobs', 'Pods'];

  getChildren(parent?: BaseNocalhostNode): Promise<vscode.ProviderResult<WorkloadSubFolderNode[]>> {
    return Promise.resolve(this.children.map((type) => this.createChild(type)));
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let treeItem = new vscode.TreeItem(this.label, vscode.TreeItemCollapsibleState.Collapsed);
    return treeItem;
  }

  createChild(type: string) {
    let node: WorkloadSubFolderNode;
    switch(type) {
      case 'Deployments':
        node = new DeploymentFolder();
        break;
      case 'StatefuleSets':
        node = new StatefulSetFolder();
        break;
      case 'DaemonSets':
        node = new DaemonSetFolder();
        break;
      case 'Jobs':
        node = new JobFolder();
        break;
      case 'CronJobs':
        node = new CronJobFolder();
        break;
      case 'Pods':
        node = new PodFolder();
        break;
      default:
        throw new Error('not implement the resource');
    }

    return node;
  }
}

export class DeploymentFolder extends KubernetesResourceFolder {
  public label: string = 'Deployments';
  public type: string = DEPLOYMENT_FOLDER;
  async getChildren(parent?: BaseNocalhostNode): Promise<vscode.ProviderResult<Deployment[]>> {
    const res = await getResourceList(host, 'Deployments');
    const list = JSON.parse(res as string) as List;
    const result: Deployment[] = list.items.map((item) => new Deployment(item.metadata.name, item.metadata.name, item));

    return result;
  }
}

export class Deployment extends KubernetesResourceNode {
  
  public type = DEPLOYMENT;
  public resourceType = 'Deployment';
  constructor(public label: string, public name: string, public info?: any) {
    super();
    this.label = label;
    this.info = info;
    this.name = name;
  }

  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let treeItem = new vscode.TreeItem(this.label, vscode.TreeItemCollapsibleState.None);
    treeItem.contextValue = "workload-deployment";
    return treeItem;
  }

}

export class StatefulSet extends KubernetesResourceNode {
  
  public type = STATEFUL_SET;
  public resourceType = 'StatefulSet';
  constructor(public label: string, public name: string, public info?: any) {
    super();
    this.label = label;
    this.info = info;
    this.name = name;
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let treeItem = new vscode.TreeItem(this.label, vscode.TreeItemCollapsibleState.None);
    treeItem.contextValue = "workload-statefulSet";
    return treeItem;
  }
}


export class DaemonSet extends KubernetesResourceNode {
  
  public type = DAEMON_SET;
  public resourceType = 'DaemonSet';
  constructor(public label: string, public name: string, public info?: any) {
    super();
    this.label = label;
    this.info = info;
    this.name = name;
  }

  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let treeItem = new vscode.TreeItem(this.label, vscode.TreeItemCollapsibleState.None);
    treeItem.contextValue = "workload-daemonSet";
    return treeItem;
  }
}

export class Job extends KubernetesResourceNode {
  
  public type = JOB;
  public resourceType = 'job';
  constructor(public label: string, public name: string, public info?: any) {
    super();
    this.label = label;
    this.info = info;
    this.name = name;
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let treeItem = new vscode.TreeItem(this.label, vscode.TreeItemCollapsibleState.None);
    treeItem.contextValue = "workload-job";
    return treeItem;
  }
}

export class CronJob extends KubernetesResourceNode {
  public type = CRON_JOB;
  public resourceType = 'cronJob';
  constructor(public label: string, public name: string, public info?: any) {
    super();
    this.label = label;
    this.info = info;
    this.name = name;
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let treeItem = new vscode.TreeItem(this.label, vscode.TreeItemCollapsibleState.None);
    treeItem.contextValue = "workload-cronJob";
    return treeItem;
  }
}

export class Pod extends KubernetesResourceNode {
  public type = POD;
  public resourceType = 'pod';
  constructor(public label: string, public name: string, public info?: any) {
    super();
    this.label = label;
    this.info = info;
    this.name = name;
  }
}

export class StatefulSetFolder extends KubernetesResourceFolder {
  public label: string = 'StatefulSets';
  public type: string = STATEFUL_SET_FOLDER;
  async getChildren(parent?: BaseNocalhostNode): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await getResourceList(host, 'StatefulSets');
    const list = JSON.parse(res as string) as List;
    const result: StatefulSet[] = list.items.map((item) => new StatefulSet(item.metadata.name, item.metadata.name, item));

    return result;
  }
}

export class DaemonSetFolder extends KubernetesResourceFolder {
  public label: string = 'DaemonSets';
  public type: string = DAEMON_SET_FOLDER;
  async getChildren(parent?: BaseNocalhostNode): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await getResourceList(host, 'DaemonSets');
    const list = JSON.parse(res as string) as List;
    const result: DaemonSet[] = list.items.map((item) => new DaemonSet(item.metadata.name, item.metadata.name, item));

    return result;
  }
}

export class JobFolder extends KubernetesResourceFolder {
  public label: string = 'Jobs';
  public type: string = JOBS_FOLDER;
  async getChildren(parent?: BaseNocalhostNode): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await getResourceList(host, 'Jobs');
    const list = JSON.parse(res as string) as List;
    const result: Job[] = list.items.map((item) => new Job(item.metadata.name, item.metadata.name, item));

    return result;
  }
}

export class CronJobFolder extends KubernetesResourceFolder {
  public label: string = 'CronJobs';
  public type: string = CRON_JOBS_FOLDER;
  async getChildren(parent?: BaseNocalhostNode): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await getResourceList(host, 'CronJobs');
    const list = JSON.parse(res as string) as List;
    const result: CronJob[] = list.items.map((item) => new CronJob(item.metadata.name, item.metadata.name, item));

    return result;
  }
}

export class PodFolder extends KubernetesResourceFolder {
  public label: string = 'Pods';
  public type: string = PODS_FOLDER;
  async getChildren(parent?: BaseNocalhostNode): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await getResourceList(host, 'Pods');
    const list = JSON.parse(res as string) as List;
    const result: Pod[] = list.items.map((item) => new Pod(item.metadata.name, item.metadata.name, item));

    return result;
  }
}

export class NocalhostRootNode implements BaseNocalhostNode {
  public label: string = 'Nocalhost';
  public type = ROOT;
  private children = ['Applications', 'Workloads', 'Networks'];
  getChildren(): Promise<vscode.ProviderResult<NocalhostFolderNode[]>> {
    return Promise.resolve(this.children.map((type) => this.createChild(type)));
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return {};
  }

  private createChild(type: string) {
    let folderNode: NocalhostFolderNode;
    switch (type) {
      case 'Applications':
        folderNode = new AppFolderNode();
        break;
      case 'Workloads':
        folderNode = new WorkloadFolderNode();
        break;
      case 'Networks':
        folderNode = new NetworkFolderNode();
        break;
      default:
        folderNode = new AppFolderNode();
    }

    return folderNode;
  }

}