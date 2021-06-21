import AccountClusterService, {
  AccountClusterNode,
} from "./../../clusters/AccountCluster";
import * as vscode from "vscode";

export interface AppInfo {
  name: string;
  releasename: string;
  namespace: string;
  kubeconfig: string;
  dependencyConfigMapName: string;
  appType: string;
  svcProfile: Array<SvcProfile>;
  installed: boolean;
  resourcePath: string;
}

export interface SvcProfile {
  rawConfig: {
    name: string;
    serviceType: string;
    gitUrl: string;
    devContainerImage: string;
    syncDirs: Array<string>;
    persistentVolumeDirs: Array<string>;
    devContainerShell: string;
    ignores: Array<string>;
    devContainerResources: any;
    devPorts: Array<string>;
    dependPodsLabelSelector: Array<string>;
    syncFilePattern: [];
    ignoreFilePattern: [];
  };
  readyReplicas: number;
  cmconfigloaded: boolean;
  actualName: string;
  developing: boolean;
  portForwarded: boolean;
  associate: string;
  syncing: boolean;
  possess: boolean;
  remoteSyncthingPort: number;
  remoteSyncthingGUIPort: number;
  localSyncthingPort: number;
  localconfigloaded: boolean;
  localSyncthingGUIPort: number;
  localAbsoluteSyncDirFromDevStartPlugin: Array<string>;
  devPortForwardList: Array<{
    role?: string;
    localport: number;
    remoteport: number;
    way: string;
    status: string;
    reason: string;
    updated: string;
    pid: number;
  }>;
}

export interface BaseNocalhostNode {
  label: string;
  type: string;
  accountClusterService?: AccountClusterService;
  hasInit?: boolean;
  parent: BaseNocalhostNode | undefined | null;
  updateData?: (init: boolean) => Promise<any>;
  getNodeStateId(): string;
  getChildren(
    parent?: BaseNocalhostNode
  ):
    | Promise<vscode.ProviderResult<BaseNocalhostNode[]>>
    | vscode.ProviderResult<BaseNocalhostNode[]>;
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem>;

  getParent(element?: BaseNocalhostNode): BaseNocalhostNode | null | undefined;
}

export enum DeploymentStatus {
  running = "running",
  developing = "developing",
  starting = "starting",
  unknown = "unknown",
}
