export interface ISvcProfile {
  name: string;
  serviceType: string;
  gitUrl: string;
  devContainerImage: string;
  workDir: string;
  syncDirs: string[];
  ignores: string[];
  devPorts: string[];
  developing: boolean;
  portForwarded: boolean;
  syncing: boolean;
  localAbsoluteSyncDirFromDevStartPlugin: string[];
  devPortList: string[];
}

export default class SvcProfile implements ISvcProfile {
  name: string;
  serviceType: string;
  gitUrl: string;
  devContainerImage: string;
  workDir: string;
  syncDirs: string[];
  ignores: string[];
  devPorts: string[];
  developing: boolean;
  portForwarded: boolean;
  syncing: boolean;
  localAbsoluteSyncDirFromDevStartPlugin: string[];
  devPortList: string[];

  constructor(
    name: string,
    serviceType: string,
    gitUrl: string,
    devContainerImage: string,
    workDir: string,
    syncDirs: string[],
    ignores: string[],
    devPorts: string[],
    developing: boolean,
    portForwarded: boolean,
    syncing: boolean,
    localAbsoluteSyncDirFromDevStartPlugin: string[],
    devPortList: string[]
  ) {
    this.name = name;
    this.serviceType = serviceType;
    this.gitUrl = gitUrl;
    this.devContainerImage = devContainerImage;
    this.workDir = workDir;
    this.syncDirs = syncDirs;
    this.ignores = ignores;
    this.devPorts = devPorts;
    this.developing = developing;
    this.portForwarded = portForwarded;
    this.syncing = syncing;
    this.localAbsoluteSyncDirFromDevStartPlugin = localAbsoluteSyncDirFromDevStartPlugin;
    this.devPortList = devPortList;
  }
}
