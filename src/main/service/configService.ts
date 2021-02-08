import * as yaml from "yaml";
import * as nhctl from "../ctl/nhctl";

export interface JobConfig {
  name: string;
  path: string;
  priority?: number;
}

export interface NocalhostServiceConfig {
  name: string;
  nameRegex?: string;
  serviceType: string;
  dependLabelSelector: any;
  containers: Array<ContainerConfig>;
}
export interface ContainerConfig {
  name: string;
  install: boolean;
  dev: {
    gitUrl: string;
    image: string;
    shell?: string;
    resources?: any;
    sync: {
      type?: string;
      filePattern?: Array<string>;
      ignoreFilePattern?: Array<string>;
    };
    env: Array<string>;
    envFrom?: any;
    portForward: Array<string>;
    workDir?: string; // default value: "/home/nocalhost-dev"
    persistentVolumeDirs?: Array<string>;
    command: {
      build?: Array<string>;
      run?: Array<string>;
      debug?: Array<string>;
      hotReloadRun?: Array<string>;
      hotReloadDebug?: Array<string>;
    };
    debug: any;
    remoteDebugPort?: number;
    useDevContainer?: boolean;
  };
}

export interface NocalhostConfig {
  name: string; // uniq
  manifestType: string; // helm
  resourcePath: Array<string>; // default: ["."]
  minimalInstall?: boolean;
  onPreInstall?: Array<JobConfig>;
  onPostInstall?: Array<JobConfig>;
  onPreUninstall?: Array<JobConfig>;
  onPostUninstall?: Array<JobConfig>;
  services: Array<NocalhostServiceConfig>;
}

export default class ConfigService {
  static async getAppConfig(appName: string) {
    const configStr = await nhctl.getConfig(appName);
    const config = yaml.parse(configStr) as NocalhostConfig;

    return config;
  }

  static async writeConfig(
    appName: string,
    workloadName: string | undefined | null,
    config: NocalhostConfig | NocalhostServiceConfig
  ) {
    let objJsonStr = JSON.stringify(config);
    let objJsonB64 = Buffer.from(objJsonStr).toString("base64");
    await nhctl.editConfig(appName, workloadName, objJsonB64);
  }

  static async getWorkloadConfig(
    appName: string,
    workloadName: string
  ): Promise<NocalhostServiceConfig | undefined> {
    const configStr = await nhctl.getConfig(appName, workloadName);
    const config = yaml.parse(configStr) as NocalhostServiceConfig;

    return config;
  }

  static async getContaienrConfig(
    appName: string,
    workloadName: string,
    containerName: string
  ) {
    const configStr = await nhctl.getConfig(appName, workloadName);
    const config = yaml.parse(configStr) as NocalhostServiceConfig;
    let containerConfig: ContainerConfig | null = null;
    if (config.containers.length > 1) {
      for (const container of config.containers) {
        if (!container.name) {
          container.name = "";
        }
        if (container.name === containerName) {
          containerConfig = container;
        }
      }
    } else {
      containerConfig = config.containers[0];
    }

    return containerConfig;
  }
}
