import * as vscode from "vscode";
import { IRootNode } from "../../domain";
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
  annotationsconfigloaded?: boolean;
  cmconfigloaded: boolean;
  actualName: string;
  developing: boolean;
  devModeType: "replace" | "duplicate";
  develop_status: "NONE" | "STARTING" | "STARTED";
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
  hasInit?: boolean;
  resourceType?: string;
  parent: BaseNocalhostNode | undefined | null;
  rootNode?: IRootNode;
  updateData?: (
    init?: boolean,
    token?: vscode.CancellationToken,
    isCancel?: () => boolean
  ) => Promise<any>;
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
  develop_starting = "develop_starting",
  starting = "starting",
  unknown = "unknown",
}

export interface NodeInfo {
  appName: string;
  name: string;
  resourceType: string;
  namespace: string;
  kubeConfigPath: string;
}
