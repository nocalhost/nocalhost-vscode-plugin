export interface IDescribeConfig {
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
