import * as yaml from "yaml";
import { getApplication } from "../../api";
import {
  IApplication,
  IApplicationContext,
  IApplicationConfig,
  IApplicationConfigService,
  IApplicationDescribe,
  IApplicationDescribeSvcProfile,
  IApplicationDescribeSvcProfileRawConfig,
  IApplicationMeta,
  IApplicationMetaSvcProfile,
} from "./index.types";
import * as shell from "../../ctl/shell";
import services, { ServiceResult } from "./services";
import { DATA_CENTER_INTERVAL_MS } from "../../constants";

interface IDataStore {
  applications: IApplication[];
  applicationMetas: Map<string, IApplicationMeta>;
  applicationDescribes: Map<string, IApplicationDescribe>;
  applicationConfigs: Map<string, IApplicationConfig>;
}
export interface IExecCommandResult {
  success: boolean;
  value: string;
}
let instance: DataCenter | null = null;

export type ApplicationListener = (applications?: IApplication[]) => void;

export default class DataCenter {
  public static getInstance(timeout = DATA_CENTER_INTERVAL_MS): DataCenter {
    if (!instance) {
      instance = new DataCenter(timeout);
    }
    return instance;
  }

  public static async execCommand(
    command: string
  ): Promise<IExecCommandResult> {
    const shellObj = await shell.execAsyncWithReturn(command, []);
    const success: boolean = shellObj.code === 0;
    const value: string =
      shellObj.code === 0 ? shellObj.stdout : shellObj.stderr;
    return { success, value };
  }

  private dataStore: IDataStore = {
    applications: new Array<IApplication>(),
    applicationMetas: new Map<string, IApplicationMeta>(),
    applicationDescribes: new Map<string, IApplicationDescribe>(),
    applicationConfigs: new Map<string, IApplicationConfig>(),
  };
  private listeners: ApplicationListener[] = [];

  private constructor(timeout?: number) {
    this.setApplications(timeout);
  }

  private async setApplications(timeout?: number): Promise<void> {
    const results: any[] = await getApplication();
    const applications: Promise<IApplication>[] = results.map(
      async (result: any) => {
        const contextObj: any = JSON.parse(result.context || "{}");
        const context: IApplicationContext = {
          source: contextObj.source || "",
          installType: contextObj["install_type"] || "rawManifest",
          applicationName: contextObj["application_name"] || "",
          applicationURL: contextObj["application_url"] || "",
          resourceDir: contextObj["resource_dir"] || ["manifest/templates"],
          applicationConfigPath: contextObj["application_config_path"] || "",
          nocalhostConfig: contextObj["nocalhost_config"] || "",
        };
        await this.fetchApplicationMeta(context.applicationName);
        await this.fetchApplicationDescribe(context.applicationName);
        await this.fetchApplicationConfig(context.applicationName);
        return {
          id: result.id,
          context: context,
          status: result.status,
          installStatus: result["install_status"],
          kubeConfig: result.kubeconfig || "",
          cpu: result.cpu,
          memory: result.memory,
          namespace: result.namespace || "",
          clusterId: result["cluster_id"],
          devspaceId: result["devspace_id"],
          spaceName: result["space_name"] || "",
          storageClass: result["storage_class"] || "",
          devStartAppendCommand: result["dev_start_append_command"] || "",
        };
      }
    );
    this.dataStore.applications = await Promise.all(applications);
    if (this.listeners.length > 0) {
      this.listeners.forEach((listener: ApplicationListener) => {
        listener(this.dataStore.applications);
      });
    }

    // TODO: DO NOT DELETE, FOR: [auto refresh]
    // if (timeout) {
    //   setTimeout(() => {
    //     this.setApplications(timeout);
    //   }, timeout);
    // }
  }

  private async fetchApplicationMeta(applicationName: string): Promise<void> {
    const result: ServiceResult = await services.fetchApplicationMeta(
      applicationName
    );
    const rawData: string = result.success ? result.value : "";
    if (rawData) {
      const data: any = yaml.parse(rawData);
      if (typeof data !== "string") {
        const svcProfile: IApplicationMetaSvcProfile[] =
          data.svcProfile && Array.isArray(data.svcProfile)
            ? data.svcProfile.map((profile: any) => ({
                name: profile.name || "",
                serviceType: profile.serviceType || "",
                gitUrl: profile.gitUrl || "",
                devContainerImage: profile.devContainerImage || "",
                workDir: profile.workDir || "",
                syncDirs: profile.syncDirs || [],
                devPorts: profile.devPorts || [],
                developing: profile.developing || false,
                portForwarded: profile.portForwarded || false,
                syncing: profile.syncing || false,
                localAbsoluteSyncDirFromDevStartPlugin:
                  profile.localAbsoluteSyncDirFromDevStartPlugin || [],
                devPortList: profile.devPortList || [],
                syncFilePattern: profile.syncFilePattern || [],
                ignoreFilePattern: profile.ignoreFilePattern || [],
              }))
            : [];
        const meta: IApplicationMeta = {
          name: data.name || "",
          releasename: data.releasename || "",
          namespace: data.namespace || "",
          kubeConfig: data.kubeconfig || "",
          dependencyConfigMapName: data.dependencyConfigMapName || "",
          appType: data.appType || "",
          svcProfile: svcProfile,
          installed: data.installed || false,
          resourcePath: data.resourcePath || [],
        };
        this.setApplicationMeta(applicationName, meta);
      }
    }
  }

  private setApplicationMeta(
    applicationName: string,
    meta: IApplicationMeta
  ): void {
    this.dataStore.applicationMetas.set(applicationName, meta);
  }

  private async fetchApplicationDescribe(
    applicationName: string
  ): Promise<void> {
    const result: ServiceResult = await services.describeApplication(
      applicationName
    );
    const rawData: string = result.success ? result.value : "";
    if (rawData) {
      const data: any = yaml.parse(rawData);
      if (typeof data !== "string") {
        const svcProfile: IApplicationDescribeSvcProfile[] = [];
        if (data.svcProfile && Array.isArray(data.svcProfile)) {
          data.svcProfile.forEach((profile: any) => {
            const rawConfig: IApplicationDescribeSvcProfileRawConfig = {
              name: profile.rawConfig.name || "",
              serviceType: profile.rawConfig.serviceType || "",
              gitUrl: profile.rawConfig.gitUrl || "",
              devContainerImage: profile.rawConfig.devContainerImage || "",
              workDir: profile.rawConfig.workDir || "",
              persistentVolumeDirs:
                profile.rawConfig.persistentVolumeDirs || [],
              runCommand: profile.rawConfig.runCommand || [],
              hotReloadRunCommand: profile.rawConfig.hotReloadRunCommand || [],
              devContainerShell: profile.rawConfig.devContainerShell || "",
              ignores: profile.rawConfig.ignores || [],
              devContainerResources:
                profile.rawConfig.devContainerResources || "",
              devPorts: profile.rawConfig.devPorts || [],
              dependJobsLabelSelector:
                profile.rawConfig.dependJobsLabelSelector || [],
              syncFilePattern: profile.rawConfig.syncFilePattern || [],
              ignoreFilePattern: profile.rawConfig.ignoreFilePattern || [],
            };
            svcProfile.push({
              rawConfig,
              actualName: profile.actualName || "",
              developing: profile.developing || false,
              portForwarded: profile.portForwarded || false,
              syncing: profile.syncing || false,
              remoteSyncthingPort: profile.remoteSyncthingPort,
              remoteSyncthingGUIPort: profile.remoteSyncthingGUIPort,
              syncthingSecret: profile.syncthingSecret || "",
              localSyncthingPort: profile.localSyncthingPort,
              localSyncthingGUIPort: profile.localSyncthingGUIPort,
              localAbsoluteSyncDirFromDevStartPlugin:
                profile.localAbsoluteSyncDirFromDevStartPlugin || [],
              devPortList: profile.devPortList || [],
              portForwardStatusList: profile.portForwardStatusList || [],
              portForwardPidList: profile.portForwardPidList || [],
              syncFilePattern: profile.syncFilePattern || [],
              ignoreFilePattern: profile.ignoreFilePattern || [],
            });
          });
        }
        const describeInfo: IApplicationDescribe = {
          name: data.name || "",
          releasename: data.releasename || "",
          namespace: data.namespace || "",
          kubeConfig: data.kubeconfig || "",
          dependencyConfigMapName: data.dependencyConfigMapName || "",
          appType: data.appType || "",
          svcProfile: svcProfile,
          installed: data.installed || false,
          resourcePath: data.resourcePath || [],
        };
        this.setApplicationDescribe(applicationName, describeInfo);
      }
    }
  }

  private setApplicationDescribe(
    applicationName: string,
    describeInfo: IApplicationDescribe
  ): void {
    this.dataStore.applicationDescribes.set(applicationName, describeInfo);
  }

  private async fetchApplicationConfig(applicationName: string): Promise<void> {
    const result: ServiceResult = await services.fetchApplicationConfig(
      applicationName
    );
    const rawData: string = result.success ? result.value : "";
    if (rawData) {
      const data: any = yaml.parse(rawData);
      if (typeof data !== "string") {
        const services: IApplicationConfigService[] =
          data.services && Array.isArray(data.services)
            ? data.services.map((service: any) => ({
                name: service.name || "",
                serviceType: service.serviceType || "",
                gitUrl: service.gitUrl || "",
                devContainerImage: service.devContainerImage || "",
                workDir: service.workDir || "",
                persistentVolumeDirs: service.persistentVolumeDirs || [],
                runCommand: service.runCommand || [],
                hotReloadRunCommand: service.hotReloadRunCommand || [],
                devContainerShell: service.devContainerShell || "",
                ignores: service.ignores || [],
                devContainerResources: service.devContainerResources || "",
                devPorts: service.devPorts || [],
                dependJobsLabelSelector: service.dependJobsLabelSelector || [],
                syncFilePattern: service.syncFilePattern || [],
                ignoreFilePattern: service.ignoreFilePattern || [],
              }))
            : [];
        const config: IApplicationConfig = {
          services,
        };
        this.setApplicationConfig(applicationName, config);
      }
    }
  }

  private setApplicationConfig(
    applicationName: string,
    config: IApplicationConfig
  ): void {
    this.dataStore.applicationConfigs.set(applicationName, config);
  }

  public getApplications(): IApplication[] {
    return this.dataStore.applications;
  }

  public getApplicationMeta(
    applicationName: string
  ): IApplicationMeta | undefined {
    return this.dataStore.applicationMetas.get(applicationName);
  }

  public getApplicationDescribe(
    applicationName: string
  ): IApplicationDescribe | undefined {
    return this.dataStore.applicationDescribes.get(applicationName);
  }

  public getApplicationConfig(
    applicationName: string
  ): IApplicationConfig | undefined {
    return this.dataStore.applicationConfigs.get(applicationName);
  }

  public addListener(listener: ApplicationListener): void {
    this.listeners.push(listener);
  }

  public removeListener(listener: ApplicationListener): void {
    this.listeners.forEach((item: ApplicationListener, index: number) => {
      if (item === listener) {
        this.listeners.splice(index, 1);
      }
    });
  }
}
