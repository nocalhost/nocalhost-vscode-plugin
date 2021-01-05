import * as yaml from "yaml";
import { getApplication } from "../../api";
import Application from "./model/Application";
import ApplicationContext from "./model/ApplicationContext";
import ApplicationMeta from "./model/ApplicationMeta";
import * as shell from "../../ctl/shell";
import services from "./services";
import { DATA_CENTER_INTERVAL_MS } from "../../constants";

interface IDataStore {
  applications: Application[];
  applicationMetas: Map<string, ApplicationMeta>;
}
let instance: DataCenter | null = null;

export type ApplicationListener = (applications?: Application[]) => void;

export default class DataCenter {
  public static getInstance(timeout = DATA_CENTER_INTERVAL_MS): DataCenter {
    if (!instance) {
      instance = new DataCenter(timeout);
    }
    return instance;
  }

  public static async ctlFetch(command: string): Promise<string> {
    let result: string = "";
    const shellObj = await shell.execAsync(command, []);
    if (shellObj.code === 0) {
      result = shellObj.stdout;
    } else {
      result = shellObj.stderr;
    }
    return result;
  }

  private dataStore: IDataStore = {
    applications: [],
    applicationMetas: new Map(),
  };
  private listeners: ApplicationListener[] = [];

  private constructor(timeout?: number) {
    this.setApplications(timeout);
  }

  private async setApplications(timeout?: number): Promise<void> {
    const results: any[] = await getApplication();
    const applications: Promise<Application>[] = results.map(
      async (result: any) => {
        const contextObj: any = JSON.parse(result.context || "{}");
        const context: ApplicationContext = new ApplicationContext(
          contextObj.source || "",
          contextObj["install_type"] || "rawManifest",
          contextObj["application_name"] || "",
          contextObj["application_url"] || "",
          contextObj["resource_dir"] || ["manifest/templates"],
          contextObj["application_config_path"] || "",
          contextObj["nocalhost_config"] || ""
        );
        await this.fetchApplicationMeta(context.applicationName);
        return new Application(
          result.id,
          context,
          result.status,
          result.installStatus,
          result.kubeconfig || "",
          result.cpu,
          result.memory,
          result.namespace || "",
          result.clusterId,
          result.devspaceId,
          result.spaceName || "",
          result.storageClass || ""
        );
      }
    );
    this.dataStore.applications = await Promise.all(applications);
    if (this.listeners.length > 0) {
      this.listeners.forEach((listener: ApplicationListener) => {
        listener(this.dataStore.applications);
      });
    }
    if (timeout) {
      setTimeout(() => {
        this.setApplications(timeout);
      }, timeout);
    }
  }

  private async fetchApplicationMeta(applicationName: string): Promise<void> {
    const rawData: string = await services.fetchApplicationMeta(
      applicationName
    );
    if (rawData) {
      const data: any = yaml.parse(rawData);
      if (typeof data !== "string") {
        const meta: ApplicationMeta = new ApplicationMeta(
          data.name || "",
          data.releasename || "",
          data.namespace || "",
          data.kubeconfig || "",
          data.dependencyConfigMapName || "",
          data.appType || "",
          data.svcProfile || [],
          data.installed,
          data.resourcePath || []
        );
        this.setApplicationMeta(applicationName, meta);
      }
    }
  }

  private setApplicationMeta(applicationName: string, meta: ApplicationMeta) {
    this.dataStore.applicationMetas.set(applicationName, meta);
  }

  public getApplications(): Application[] {
    return this.dataStore.applications;
  }

  public getApplicationMeta(
    applicationName: string
  ): ApplicationMeta | undefined {
    return this.dataStore.applicationMetas.get(applicationName);
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
