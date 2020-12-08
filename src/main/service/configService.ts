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
  gitUrl: string;
  devContainerImage: string;
  devContainerShell?: string;
  syncType?: string;
  syncDirs?: Array<string>; // default ["."]
  ignoreDirs?: Array<string>;
  devPort?: Array<string>;
  dependPodsLabelSelector?: Array<string>;
  dependJobsLabelSelector?: Array<string>;
  workDir?: string; // default value: "/home/nocalhost-dev"
  persistentVolumeDir?: string;
  buildCommand?: string;
  runCommand?: string;
  debugCommand?: string;
  hotReloadRunCommand?: string;
  hotReloadDebugCommand?: string;
  remoteDebugPort?: number;
  useDevContainer?: string;
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
}
