import * as vscode from "vscode";

export interface AppInfo {
  name: string;
  namespace: string;
  kubeconfig: string;
  dependencyConfigMapName: string;
  appType: string;
  svcProfile: Array<SvcProfile>;
  installed: boolean;
  resourcePath: string;
}

// include application info
export interface ServiceProfile {
  name: string;
  namespace: string;
  kubeconfig: string;
  dependencyConfigMapName: string;
  appType: string;
  svcProfile: SvcProfile;
  installed: boolean;
  resourcePath: string;
}

export interface SvcProfile {
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
  localAbsoluteSyncDirFromDevStartPlugin: Array<string>;
  devPortList: Array<string>;
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
