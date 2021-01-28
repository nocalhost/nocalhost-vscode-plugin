export interface IApplication {
  id: number;
  context: IApplicationContext;
  status: number;
  installStatus: number;
  kubeConfig: string;
  cpu: number;
  memory: number;
  namespace: string;
  clusterId: number;
  devspaceId: number;
  spaceName: string;
  storageClass: string;
  devStartAppendCommand: string;
}

export interface IApplicationContext {
  source: string;
  installType: string;
  applicationName: string;
  applicationURL: string;
  resourceDir: string[];
  applicationConfigPath?: string;
  nocalhostConfig?: string;
}

export interface IApplicationConfig {
  services: IApplicationConfigService[];
}

export interface IApplicationConfigService {
  name: string;
  serviceType: string;
  gitUrl: string;
  devContainerImage: string;
  workDir: string;
  persistentVolumeDirs: string[];
  runCommand: string[];
  hotReloadRunCommand: string[];
  devContainerShell: string;
  ignores: string[];
  devContainerResources: string;
  devPorts: string[];
  dependJobsLabelSelector: string[];
  syncFilePattern: string[];
  ignoreFilePattern: string[];
  syncDirs?: string[];
}

export interface IApplicationDescribe {
  name: string;
  releasename: string;
  namespace: string;
  kubeConfig: string;
  dependencyConfigMapName: string;
  appType: string;
  svcProfile: IApplicationDescribeSvcProfile[];
  installed: boolean;
  resourcePath: string[];
}

export interface IApplicationDescribeSvcProfile {
  rawConfig: IApplicationDescribeSvcProfileRawConfig;
  actualName: string;
  developing: boolean;
  portForwarded: boolean;
  syncing: boolean;
  remoteSyncthingPort: number;
  remoteSyncthingGUIPort: number;
  syncthingSecret: string;
  localSyncthingPort: number;
  localSyncthingGUIPort: number;
  localAbsoluteSyncDirFromDevStartPlugin: string[];
  devPortList: string[];
  portForwardStatusList: string[];
  portForwardPidList: string[];
  syncFilePattern: string[];
  ignoreFilePattern: string[];
}

export interface IApplicationDescribeSvcProfileRawConfig {
  name: string;
  serviceType: string;
  gitUrl: string;
  devContainerImage: string;
  workDir: string;
  persistentVolumeDirs: string[];
  runCommand: string[];
  hotReloadRunCommand: string[];
  devContainerShell: string;
  ignores: string[];
  devContainerResources: string;
  devPorts: string[];
  dependJobsLabelSelector: string[];
  syncFilePattern: string[];
  ignoreFilePattern: string[];
}

export interface IApplicationMeta {
  name: string;
  releasename: string;
  namespace: string;
  kubeConfig: string;
  dependencyConfigMapName: string;
  appType: string;
  svcProfile: IApplicationMetaSvcProfile[];
  installed: boolean;
  resourcePath: string[];
}

export interface IApplicationMetaSvcProfile {
  name: string;
  serviceType: string;
  gitUrl: string;
  devContainerImage: string;
  workDir: string;
  syncDirs: string[];
  devPorts: string[];
  developing: boolean;
  portForwarded: boolean;
  syncing: boolean;
  localAbsoluteSyncDirFromDevStartPlugin: string[];
  devPortList: string[];
  syncFilePattern: string[];
  ignoreFilePattern: string[];
}
