import { promises } from "fs";
import * as path from "path";
import { NHCTL_DIR } from "../constants";
import * as fileUtil from "../utils/fileUtil";

export interface NocalhostConfig {
  preInstalls: Array<{
    path: string;
    weight?: string | number;
  }>;
  appConfig: {
    name: string;
    type: string;
    resourcePath: string;
  };
  svcConfigs: Array<WorkloadConfig>;
}

export interface WorkloadConfig {
  name: string;
  type: string;
  gitUrl: string;
  devLang: string; // # java|go|node|php
  devImage: string;
  workDir: string;
  localWorkDir: string;
  sync: Array<string>;
  ignore: Array<string>;
  sshPort: {
    localPort: number;
    sshPort: number;
  };
  devPort: Array<string>;
  command: Array<string>;
  jobs: Array<string>;
  pods: Array<string>;
}

export interface JobConfig {
  name: string;
  path: string;
  priority?: number;
}

export interface NocalhostServiceConfig {
  name?: string;
  nameRegex?: string;
  type: string;
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
}

export interface NewNocalhostConfig {
  name: string; // uniq
  manifestType: string; // helm
  resourcePath: Array<string>; // default: ["."]
  minimalInstall: boolean;
  onPreInstall?: Array<JobConfig>;
  onPostInstall?: Array<JobConfig>;
  onPreUninstall?: Array<JobConfig>;
  onPostUninstall?: Array<JobConfig>;
  services: Array<NocalhostServiceConfig>;
}

export default class ConfigService {
  static async getAppConfig(appName: string) {
    const configPath = ConfigService.getAppConfigPath(appName);
    await fileUtil.accessFile(configPath);
    const config = (await fileUtil.readYaml(configPath)) as NocalhostConfig;

    return config;
  }

  static async writeAppConfig(appName: string, config: NocalhostConfig) {
    const configPath = ConfigService.getAppConfigPath(appName);
    await fileUtil.writeYaml(configPath, config);
  }

  static async getWorkloadConfig(
    appName: string,
    workloadName: string
  ): Promise<WorkloadConfig | undefined> {
    const appConfig = await ConfigService.getAppConfig(appName);
    const svcConfigs = appConfig.svcConfigs;
    let workloadConfig;
    for (let i = 0; i < svcConfigs.length; i++) {
      if (svcConfigs[i] && svcConfigs[i].name === workloadName) {
        workloadConfig = svcConfigs[i];
        return workloadConfig;
      }
    }

    return workloadConfig;
  }

  static getAppConfigPath(appName: string) {
    return path.resolve(
      NHCTL_DIR,
      "application",
      appName,
      ".nocalhost",
      "config.yaml"
    );
  }
}
