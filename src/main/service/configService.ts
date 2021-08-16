import * as yaml from "yaml";
import * as nhctl from "../ctl/nhctl";
const lineBreakFlag = "\n";
export interface JobConfig {
  name: string;
  path: string;
  priority?: number;
}

export interface NocalhostServiceConfig {
  name: string;
  nameRegex?: string;
  __note?: string;
  serviceType: string;
  dependLabelSelector: any;
  containers: Array<ContainerConfig>;
}
export interface ContainerConfig {
  name: string;
  install?: {
    env?: Array<{
      name: string;
      value: string;
    }>;
    envFrom?: {
      envFile?: Array<{
        path: string;
      }>;
    };
    portForward?: Array<string>;
  };
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
    command?: {
      build?: Array<string>;
      run?: Array<string>;
      debug?: Array<string>;
      hotReloadRun?: Array<string>;
      hotReloadDebug?: Array<string>;
    };
    debug?: {
      remoteDebugPort: number;
    };
    remoteDebugPort?: number;
    useDevContainer?: boolean;
    [key: string]: any;
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
  env?: Array<{
    name: string;
    value: string;
  }>;
  envFrom?: {
    envFile?: Array<{
      path: string;
    }>;
  };
  helmValues?: Array<{
    name: string;
    value: string;
  }>;
  services: Array<NocalhostServiceConfig>;
}

export default class ConfigService {
  static async getAppConfig(
    kubeConfigPath: string,
    namespace: string,
    appName: string
  ) {
    const configStr = await nhctl.getConfig(kubeConfigPath, namespace, appName);
    try {
      const config = yaml.parse(configStr) as NocalhostConfig;
      return config;
    } catch (e) {
      console.log(e);
      return e;
    }
  }

  static async writeConfig(
    kubeConfigPath: string,
    namespace: string,
    appName: string,
    workloadName: string | undefined | null,
    workloadType: string | undefined | null,
    config: NocalhostConfig | NocalhostServiceConfig
  ) {
    let objJsonStr = JSON.stringify(config);
    let objJsonB64 = Buffer.from(objJsonStr).toString("base64");
    await nhctl.editConfig(
      kubeConfigPath,
      namespace,
      appName,
      workloadName,
      workloadType,
      objJsonB64
    );
  }

  static async getWorkloadConfig(
    kubeConfigPath: string,
    namespace: string,
    appName: string,
    workloadName: string,
    workloadType?: string
  ): Promise<NocalhostServiceConfig | undefined> {
    const configStr = await nhctl.getConfig(
      kubeConfigPath,
      namespace,
      appName,
      workloadName,
      workloadType
    );
    const nodes = (configStr.split(lineBreakFlag) || []).filter((i: string) =>
      i.startsWith("#")
    );
    const nodeStr = (nodes || []).join(lineBreakFlag) + lineBreakFlag;
    const config = yaml.parse(configStr) as NocalhostServiceConfig;
    config.__note = nodeStr;
    return config;
  }

  static async profileSetConfig() {}

  static async getContaienrConfig(
    kubeConfigPath: string,
    namespace: string,
    appName: string,
    workloadName: string,
    workloadType: string,
    containerName: string
  ) {
    const configStr = await nhctl.getConfig(
      kubeConfigPath,
      namespace,
      appName,
      workloadName,
      workloadType
    );
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

  static async getAppAllConfig(
    kubeConfigPath: string,
    namespace: string,
    appName: string
  ) {
    const configStr = await nhctl.getAppConfig(
      kubeConfigPath,
      namespace,
      appName
    );
    const config = yaml.parse(configStr) as NocalhostConfig;

    return config;
  }

  static async writeAppConfig(
    kubeConfigPath: string,
    namespace: string,
    appName: string,
    config: NocalhostConfig
  ) {
    let objJsonStr = JSON.stringify(config);
    let objJsonB64 = Buffer.from(objJsonStr).toString("base64");
    await nhctl.editAppConfig(kubeConfigPath, namespace, appName, objJsonB64);
  }
}
