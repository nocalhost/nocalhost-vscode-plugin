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
  actualName: string;
  developing: boolean;
  portForwarded: boolean;
  syncing: boolean;
  remoteSyncthingPort: number;
  remoteSyncthingGUIPort: number;
  localSyncthingPort: number;
  localSyncthingGUIPort: number;
  localAbsoluteSyncDirFromDevStartPlugin: Array<string>;
  devPortList: Array<string>;
  portForwardStatusList: Array<string>;
  portForwardPidList: Array<string>;
}

export interface BaseNocalhostNode {
  label: string;
  type: string;
  parent: BaseNocalhostNode | undefined | null;
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
