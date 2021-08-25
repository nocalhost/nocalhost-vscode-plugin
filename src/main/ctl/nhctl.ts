import { PLUGIN_TEMP_DIR, TEMP_NHCTL_BIN } from "./../constants";
import * as vscode from "vscode";
import * as semver from "semver";
import * as path from "path";
import * as fs from "fs";
import { spawn } from "child_process";
import {
  execAsyncWithReturn,
  execChildProcessAsync,
  ShellResult,
} from "./shell";
import host, { Host } from "../host";
import * as yaml from "yaml";
import { get as _get, orderBy } from "lodash";
import { readYaml, replaceSpacePath } from "../utils/fileUtil";
import * as packageJson from "../../../package.json";
import { IS_LOCAL, NH_BIN } from "../constants";
import services from "../common/DataCenter/services";
import { SvcProfile } from "../nodes/types/nodeType";
import logger from "../utils/logger";
import { IDevSpaceInfo, IPortForWard } from "../domain";
import {
  PodResource,
  Resource,
  ResourceStatus,
} from "../nodes/types/resourceType";
import { downloadNhctl, lock, unlock } from "../utils/download";
import { keysToCamel } from "../utils";
import { IPvc } from "../domain";
import { getConfiguration } from "../utils/conifg";
import { KubeConfigState } from "../nodes/KubeConfigNode";

export interface InstalledAppInfo {
  name: string;
  type: string;
}

export type IBaseCommand<T = any> = {
  kubeConfigPath: string;
  namespace?: string;
} & T;
export interface AllInstallAppInfo {
  namespace: string;
  application: Array<InstalledAppInfo>;
}

export class NhctlCommand {
  public baseCommand: string = null;
  public args: string[] = null;
  private argTheTail: string = null;
  private baseParams: IBaseCommand = null;
  public static nhctlPath: string = path.resolve(
    NH_BIN,
    host.isWindow() ? "nhctl.exe" : "nhctl"
  );
  private outputMethod: string = "toJson";
  constructor(base: string, baseParams?: IBaseCommand<unknown>) {
    this.baseParams = baseParams;
    this.args = [];
    this.baseCommand = `${NhctlCommand.nhctlPath} ${base || ""}`;
  }
  static create(base: string, baseParams?: IBaseCommand<unknown>) {
    return new NhctlCommand(base, baseParams);
  }
  static get(baseParams?: IBaseCommand<unknown>) {
    return NhctlCommand.create("get", baseParams);
  }
  static exec(baseParams?: IBaseCommand<unknown>) {
    return NhctlCommand.create("k exec", baseParams);
  }
  static logs(baseParams?: IBaseCommand<unknown>) {
    return NhctlCommand.create("k logs", baseParams);
  }
  static delete(baseParams?: IBaseCommand<unknown>) {
    return NhctlCommand.create("k delete", baseParams);
  }
  static portForward(baseParams?: IBaseCommand<unknown>) {
    return NhctlCommand.create("port-forward", baseParams);
  }
  static list(baseParams?: IBaseCommand<unknown>) {
    return NhctlCommand.create("list", baseParams);
  }

  static install(baseParams?: IBaseCommand<unknown>) {
    return NhctlCommand.create("install", baseParams);
  }
  static authCheck(
    baseParams: IBaseCommand<
      { args: string[]; base: string } & Required<
        Pick<IBaseCommand, "namespace">
      >
    >
  ) {
    const { base, args, ...rest } = baseParams;

    args.push("--auth-check");

    const nhctlCommand = NhctlCommand.create(base, rest);
    nhctlCommand.args = args;

    return nhctlCommand;
  }
  addArgument(arg: string, value?: string | number) {
    if (arg === "-o" && value) {
      if (["yaml", "json"].indexOf((value as string).toLowerCase()) !== -1) {
        this.outputMethod = value as string;
      }
    }
    if (arg) {
      this.args.push(arg);
    }
    if (value) {
      this.args.push(value as string);
    }
    return this;
  }
  addArgumentStrict(arg: string, value: string | number | string[]) {
    if (!arg || !value) {
      return this;
    }
    if (Array.isArray(value)) {
      value.forEach((item: string) => {
        this.addArgument(arg, item);
      });
      return this;
    }
    return this.addArgument(arg, value);
  }
  addArgumentTheTail(arg: string) {
    this.argTheTail = arg;
    return this;
  }
  getCommand(): string {
    if (this.baseParams) {
      this.addArgumentStrict("--kubeconfig", this.baseParams.kubeConfigPath);
      this.addArgumentStrict("--namespace", this.baseParams.namespace);
    }
    if (this.argTheTail) {
      this.args.push(this.argTheTail || "");
    }

    return `${this.baseCommand} ${this.args.join(" ")}`;
  }
  toJson() {
    this.outputMethod = "json";
    return this;
  }

  toYaml() {
    this.outputMethod = "yaml";
    return this;
  }

  toString() {
    this.outputMethod = "string";
    return this;
  }

  async exec(hasParse = true) {
    const command = this.getCommand();
    const result = await execAsyncWithReturn(command, [], Date.now());
    if (!result) {
      return null;
    }
    if (!hasParse) {
      return result.stdout;
    }
    if (this.outputMethod === "yaml") {
      if (result && result.stdout) {
        try {
          const res = yaml.parse(result.stdout);
          return res;
        } catch (e) {
          return null;
        }
      }
    }
    if (this.outputMethod === "json") {
      if (result && result.stdout) {
        try {
          const res = JSON.parse(result.stdout);
          return res;
        } catch (e) {
          return null;
        }
      }
    }
    if (this.outputMethod === "yaml") {
      if (result && result.stdout) {
        try {
          const res = yaml.parse(result.stdout);
          return res;
        } catch (e) {
          return null;
        }
      }
    }
    return result.stdout;
  }
}

export async function getPodNames(
  props: IBaseCommand<{
    kind: string;
    name: string;
  }>
) {
  let podNameArr: Array<string> = [];
  let resArr = await getControllerPod(props);
  if (resArr && resArr.length <= 0) {
    return podNameArr;
  }
  resArr = (resArr as Array<Resource>).filter((res) => {
    if (res.status) {
      const status = res.status as ResourceStatus;
      if (status.phase === "Running" && res.metadata["deletionTimestamp"]) {
        return false;
      }
    }

    return true;
  });
  podNameArr = (resArr as Array<Resource>).map((res) => {
    return res.metadata.name;
  });
  return podNameArr;
}
export async function getControllerPod(
  props: IBaseCommand<{
    kind: string;
    name: string;
  }>
) {
  const { kubeConfigPath, namespace, kind, name } = props;

  const result = await NhctlCommand.get(props)
    .addArgument(kind)
    .addArgument(name)
    .addArgument("-o", "json")
    .exec();
  const labels = _get(result, "info.spec.selector.matchLabels");
  let labelStrArr = new Array<string>();
  for (const key in labels) {
    labelStrArr.push(`${key}=${labels[key]}`);
  }
  const labelStr = labelStrArr.join(",");
  const list = await getResourceList({
    label: labelStr,
    kind: "pods",
    kubeConfigPath,
    namespace,
  });

  return list;
}

export async function getRunningPodNames(
  props: IBaseCommand<{
    name: string;
    kind: string;
  }>
) {
  let podNameArr: Array<string> = [];
  let resArr = await getControllerPod(props);
  if (resArr && resArr.length <= 0) {
    return podNameArr;
  }
  resArr = (resArr as Array<Resource>).filter((res) => {
    if (res.status) {
      const status = res.status as ResourceStatus;
      if (status.phase === "Running" && !res.metadata["deletionTimestamp"]) {
        return true;
      }
    }

    return false;
  });
  podNameArr = (resArr as Array<Resource>).map((res) => {
    return res.metadata.name;
  });
  return podNameArr;
}

export async function getContainerNames(
  props: IBaseCommand<{
    podName: string;
  }>
) {
  const podStr = await getLoadResource({
    ...props,
    kind: "pods",
    name: props.podName,
    outputType: "json",
  });
  const pod = JSON.parse(podStr as string) as PodResource;

  const containerNameArr = pod.spec.containers.map((c) => {
    return c.name;
  });

  return containerNameArr;
}

export async function getLoadResource(
  props: IBaseCommand<{
    kind: string;
    name: string;
    outputType: string;
  }>
): Promise<string> {
  const { kind, name, outputType = "yaml" } = props;
  const result = await NhctlCommand.get(props)
    .addArgument(kind)
    .addArgument(name)
    .addArgument("-o", outputType)
    .exec();
  if (outputType === "json") {
    try {
      return JSON.stringify(result.info);
    } catch (e) {
      console.log(e);
      logger.error(e);
      return null;
    }
  }
  if (outputType === "yaml") {
    try {
      return yaml.stringify(result.info);
    } catch (e) {
      console.log(e);
      logger.error(e);
      return null;
    }
  }
  return null;
}

export async function getResourceList(
  props: IBaseCommand<{
    kind: string;
    label?: string;
  }>
) {
  const { kind, label } = props;
  const result = await NhctlCommand.get(props)
    .addArgument(kind)
    .addArgumentStrict("-l", label)
    .addArgument("-o", "json")
    .toJson()
    .exec();
  return (result || []).map((it: any) => ({ ...it.info }));
}

export async function getAllNamespace(props: IBaseCommand<unknown>) {
  const devspaces = new Array<IDevSpaceInfo>();
  const kubeConfig = fs.readFileSync(props.kubeConfigPath);
  const result = await NhctlCommand.get(props)
    .addArgument("ns")
    .addArgument("-o", "json")
    .toJson()
    .exec();
  if (!result) {
    const devspace: IDevSpaceInfo = {
      id: 0,
      userId: 0,
      spaceName: props.namespace,
      clusterId: 0,
      kubeconfig: `${kubeConfig}`,
      memory: 0,
      cpu: 0,
      spaceResourceLimit: "",
      namespace: props.namespace,
      status: 0,
      storageClass: "",
      devStartAppendCommand: [],
    };

    devspaces.push(devspace);

    return devspaces;
  }
  (result || []).forEach((it: any) => {
    const ns = it.info;
    const devspace: IDevSpaceInfo = {
      id: 0,
      userId: 0,
      spaceName: ns["metadata"]["name"],
      clusterId: 0,
      kubeconfig: `${kubeConfig}`,
      memory: 0,
      cpu: 0,
      spaceResourceLimit: "",
      namespace: ns["metadata"]["name"],
      status: 0,
      storageClass: "",
      devStartAppendCommand: [],
    };

    devspaces.push(devspace);
  });
  return devspaces;
}

export async function getAll(params: IBaseCommand) {
  const result = await NhctlCommand.get(params)
    .addArgument("all")
    .addArgument("-o", "json")
    .exec();

  if (result && result.stdout) {
    try {
      const res = JSON.parse(result.stdout);
      return res;
    } catch (error) {
      throw error;
    }
  }
}

export async function getPortForWardByApp(
  props: IBaseCommand<{
    appName: string;
  }>
): Promise<IPortForWard[]> {
  return await NhctlCommand.portForward({
    kubeConfigPath: props.kubeConfigPath,
    namespace: props.namespace,
  })
    .addArgument("list", props.appName)
    .toJson()
    .addArgument("--json")
    .exec();
}

export async function getInstalledApp(
  ns: string,
  kubeconfig: string
): Promise<AllInstallAppInfo[]> {
  let obj: AllInstallAppInfo[] = await NhctlCommand.list({
    kubeConfigPath: kubeconfig,
  })
    .addArgument("--yaml")
    .addArgumentStrict("-n", ns)
    .toYaml()
    .exec();

  return orderBy(obj, "namespace");
}

export async function install(props: {
  host: Host;
  kubeconfigPath: string;
  namespace: string;
  appName: string;
  appConfig: string;
  helmNHConfigPath: string;
  gitUrl: string;
  installType: string;
  resourceDir: Array<string>;
  local:
    | {
        localPath: string;
        config: string;
      }
    | undefined;
  values?: string;
  valuesStr?: string;
  refOrVersion?: string;
}) {
  const {
    host,
    kubeconfigPath,
    namespace,
    appName,
    appConfig,
    helmNHConfigPath,
    gitUrl,
    installType,
    resourceDir,
    local,
    values,
    valuesStr,
    refOrVersion,
  } = props;
  let resourcePath = "";
  if (resourceDir) {
    resourceDir.map((dir) => {
      resourcePath += ` --resource-path ${dir}`;
    });
  }
  let installCommand = nhctlCommand(
    kubeconfigPath,
    namespace,
    `install ${appName} -u ${gitUrl} -t ${installType} ${
      values ? "-f " + values : ""
    } ${valuesStr ? "--set " + valuesStr : ""} ${resourcePath} ${
      appConfig ? "--config " + appConfig : ""
    }`
  );

  if (installType === "helmRepo") {
    let chartName = "";
    if (helmNHConfigPath) {
      const obj = await readYaml(helmNHConfigPath);
      if (obj && obj.application && obj.application.name) {
        chartName = obj.application.name;
      }
      // adapte old config
      if (!chartName && obj && obj.name) {
        chartName = obj.name;
      }
    }
    installCommand = nhctlCommand(
      kubeconfigPath,
      namespace,
      `install ${appName} --helm-chart-name ${
        chartName || appName
      } -t ${installType} ${values ? "-f " + values : ""} ${
        valuesStr ? "--set " + valuesStr : ""
      } --helm-repo-url ${gitUrl} ${
        helmNHConfigPath ? "--outer-config " + helmNHConfigPath : ""
      }`
    );
  } else if (["helmLocal", "rawManifestLocal"].includes(installType)) {
    installCommand = nhctlCommand(
      kubeconfigPath,
      namespace,
      `install ${appName} -t ${installType} ${
        values ? "-f " + values : ""
      } --local-path=${local && local.localPath}  --outer-config=${
        local && local.config
      }`
    );
  }

  if (refOrVersion) {
    installCommand += ` ${
      installType === "helmRepo" ? "--helm-repo-version" : "-r"
    } ${refOrVersion}`;
  }

  host.log("cmd: " + installCommand, true);
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Installing application: ${appName}`,
      cancellable: false,
    },
    () => {
      return execChildProcessAsync(host, installCommand, [], {
        dialog: `Install application (${appName}) fail`,
      });
    }
  );
}

export async function upgrade(
  kubeconfigPath: string,
  namespace: string,
  appName: string,
  gitUrl: string,
  appType: string,
  resourceDir: Array<string>,
  appConfig: string,
  local:
    | {
        localPath: string;
        config: string;
      }
    | undefined,
  refOrVersion?: string,
  valuesPath?: string,
  valueStr?: string
) {
  let resourcePath = "";
  if (resourceDir) {
    resourceDir.map((dir) => {
      resourcePath += ` --resource-path ${dir}`;
    });
  }
  let upgradeCommand = nhctlCommand(
    kubeconfigPath,
    namespace,
    `upgrade ${appName} ${
      gitUrl && gitUrl.trim() ? `-u ${gitUrl}` : ""
    } ${resourcePath} ${appConfig ? "--config " + appConfig : ""}`
  );

  if (appType === "helmRepo") {
    upgradeCommand = nhctlCommand(
      kubeconfigPath,
      namespace,
      `upgrade ${appName} --helm-chart-name ${appName} --helm-repo-url ${gitUrl}`
    );
  } else if (["helmLocal", "rawManifestLocal"].includes(appType)) {
    upgradeCommand += ` --local-path=${local && local.localPath} --config ${
      local && local.config
    }`;
  }

  if (refOrVersion) {
    upgradeCommand += ` ${
      appType === "helmRepo" ? "--helm-repo-version" : "-r"
    } ${refOrVersion}`;
  }

  if (valuesPath) {
    upgradeCommand = `${upgradeCommand} -f ${valuesPath}`;
  }

  if (valueStr) {
    upgradeCommand = `${upgradeCommand} --set ${valueStr}`;
  }

  host.log("cmd: " + upgradeCommand, true);
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Upgrade application: ${appName}`,
      cancellable: false,
    },
    () => {
      return execChildProcessAsync(host, upgradeCommand, [], {
        dialog: `upgrade application (${appName}) fail`,
      });
    }
  );
}

export async function associate(
  kubeconfigPath: string,
  namespace: string,
  appName: string,
  dir: string,
  type: string,
  workLoadName: string
) {
  const resultDir = replaceSpacePath(dir);
  const command = nhctlCommand(
    kubeconfigPath,
    namespace,
    `dev associate ${appName} -s ${resultDir} -t ${type} -d ${workLoadName}`
  );
  const result = await execAsyncWithReturn(command, []);
  return result.stdout;
}

export async function uninstall(
  host: Host,
  kubeconfigPath: string,
  namespace: string,
  appName: string,
  force?: boolean
) {
  await host.showProgressing(
    `Uninstalling application: ${appName}`,
    async (progress) => {
      const uninstallCommand = nhctlCommand(
        kubeconfigPath,
        namespace,
        `uninstall ${appName} ${force ? `--force` : ""}`
      );
      host.log(`[cmd] ${uninstallCommand}`, true);
      await execChildProcessAsync(host, uninstallCommand, [], {
        dialog: `Uninstall application (${appName}) fail`,
        output:
          "If you want to force uninstall the application, you can perform a reset application",
      });
    }
  );
}

export async function devStart(
  host: Host,
  kubeconfigPath: string,
  namespace: string,
  appName: string,
  workLoadName: string,
  workloadType: string,
  sync: {
    isOld: boolean;
    dirs: string | Array<string>;
  },
  container?: string,
  storageClass?: string,
  devStartAppendCommand?: string
) {
  let options = "";
  if (sync.isOld && sync.dirs && sync.dirs.length > 0) {
    let dirs = sync.dirs as Array<string>;
    options = dirs.join(" -s ");
    options = "-s " + options;
  } else if (!sync.isOld && sync.dirs) {
    options = "-s " + sync.dirs;
  }
  if (storageClass) {
    options += ` --storage-class ${storageClass}`;
  }
  if (container) {
    options += ` --container ${container}`;
  }
  const devStartCommand = nhctlCommand(
    kubeconfigPath,
    namespace,
    `dev start ${appName} -d ${workLoadName} -t ${workloadType.toLowerCase()} --without-terminal  ${options} ${
      devStartAppendCommand ? devStartAppendCommand : ""
    }`
  );
  host.log(`[cmd] ${devStartCommand}`, true);
  // const isLocal = host.getGlobalState(IS_LOCAL);
  // if (isLocal) {
  //   const res = await ga.send({
  //     category: "command",
  //     action: "startDevMode",
  //     label: devStartCommand,
  //     value: 1,
  //     clientID: getUUID(),
  //   });
  //   console.log("ga: ", res);
  // }
  await execChildProcessAsync(
    host,
    devStartCommand,
    [],
    {
      dialog: `Start devMode (${appName}/${workLoadName}) fail`,
    },
    true
  );
}

function isSudo(ports: string[] | undefined) {
  let sudo = false;
  if (!ports) {
    return sudo;
  }
  ports.forEach((portStr) => {
    const localPort = portStr.split(":")[0];
    if (localPort && Number(localPort) < 1024 && host.isLinux()) {
      sudo = true;
    }
  });

  return sudo;
}

function sudoPortforward(command: string) {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const env = Object.assign(process.env, { DISABLE_SPINNER: true });
    logger.info(`[cmd] ${command}`);
    const proc = spawn(command, [], { shell: true, env });
    let stdout = "";
    let stderr = "";
    let err = `execute command fail: ${command}`;

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        host.log(err, true);
        reject(new Error(stderr || err));
      }
    });

    proc.stdout.on("data", function (data) {
      stdout += data;
      host.log("" + data);
    });

    let password = "";

    proc.stderr.on("data", async function (data) {
      stderr += data;
      host.log("" + data);
      const line = "" + data;
      if (line.indexOf("Sorry, try again") >= 0) {
        password =
          (await host.showInputBox({
            placeHolder: "please input your password",
          })) || "";
      }
      if (line.indexOf("[sudo] password for") >= 0) {
        password =
          (await host.showInputBox({
            placeHolder: "please input your password",
          })) || "";
        proc.stdin.write(`${password}\n`, (err) => {
          console.log("write " + password);
        });
      }
    });
  });
}

export async function startPortForward(
  host: Host,
  kubeconfigPath: string,
  namespace: string,
  appName: string,
  workloadName: string,
  way: "manual" | "devPorts",
  resourceType?: string,
  ports?: Array<string>,
  pod?: string
) {
  let portOptions = "";
  if (ports && ports.length > 0) {
    portOptions = ports.join(" -p ");
    portOptions = "-p " + portOptions;
  }
  const portForwardCommand = nhctlCommand(
    kubeconfigPath,
    namespace,
    `port-forward start ${appName} -d ${workloadName} ${portOptions} ${
      resourceType ? `--type ${resourceType}` : ""
    } ${pod ? `--pod ${pod}` : ""} --way ${way}`
  );

  const sudo = isSudo(ports);

  host.log(
    `[cmd] ${sudo ? `sudo -S ${portForwardCommand}` : portForwardCommand}`,
    true
  );

  const isLocal = host.getGlobalState(IS_LOCAL);
  // if (isLocal) {
  //   const res = await ga.send({
  //     category: "command",
  //     action: "startPortForward",
  //     label: portForwardCommand,
  //     value: 1,
  //     clientID: getUUID(),
  //   });
  //   console.log("ga: ", res);
  // }

  await host.showProgressing(`Starting port-forward`, async () => {
    if (sudo) {
      await sudoPortforward(`sudo -S ${portForwardCommand}`);
    } else {
      await execChildProcessAsync(host, portForwardCommand, [], {
        dialog: `Port-forward (${appName}/${workloadName}) fail`,
      });
    }
  });
}

export async function endPortForward(
  props: IBaseCommand<{
    appName: string;
    workloadName: string;
    port: string;
    resourceType: string;
  }>
) {
  const { appName, port, workloadName, resourceType } = props;
  const endPortForwardCommand = NhctlCommand.portForward(props)
    .addArgument("end", appName)
    .addArgumentStrict("-d", workloadName)
    .addArgumentStrict("-p", port)
    .addArgumentStrict("--type", resourceType)
    .getCommand();
  // nhctl port-forward end coding-agile -d nginx -p 5006:5005

  const sudo = isSudo([port]);
  const isLocal = host.getGlobalState(IS_LOCAL);
  // if (isLocal) {
  //   await ga.send({
  //     category: "command",
  //     action: "endPortForward",
  //     label: endPortForwardCommand,
  //     value: 1,
  //     clientID: getUUID(),
  //   });
  // }

  if (sudo) {
    host.log(`[cmd] sudo -S ${endPortForwardCommand}`, true);
    await sudoPortforward(`sudo -S ${endPortForwardCommand}`);
  } else {
    host.log(`[cmd] ${endPortForwardCommand}`, true);
    await execChildProcessAsync(host, endPortForwardCommand, [], {
      dialog: `End port-forward (${appName}/${workloadName}) fail`,
    });
  }
}

export async function syncFile(
  host: Host,
  kubeconfigPath: string,
  namespace: string,
  appName: string,
  workloadName: string,
  workloadType: string,
  container?: string
) {
  let baseCommand = `sync ${appName} -d ${workloadName} -t ${workloadType.toLowerCase()} ${
    container ? `--container ${container}` : ""
  }`;
  const syncFileCommand = nhctlCommand(kubeconfigPath, namespace, baseCommand);

  host.log(`[cmd] ${syncFileCommand}`, true);
  await execChildProcessAsync(host, syncFileCommand, [], {
    dialog: `Syncronize file (${appName}/${workloadName}) fail`,
  });
}

export async function endDevMode(
  host: Host,
  kubeconfigPath: string,
  namespace: string,
  appName: string,
  workLoadName: string,
  workloadType: string
) {
  await host.showProgressing(
    `Ending DevMode: ${appName}/${workLoadName}`,
    async (progress) => {
      const end = nhctlCommand(
        kubeconfigPath,
        namespace,
        `dev end ${appName} -d ${workLoadName} ${
          workloadType ? `-t ${workloadType.toLowerCase()}` : ""
        }`
      );
      host.log(`[cmd] ${end}`, true);

      // if (isLocal) {
      //   await ga.send({
      //     category: "command",
      //     action: "endDevMode",
      //     label: end,
      //     value: 1,
      //     clientID: getUUID(),
      //   });
      // }
      await execChildProcessAsync(host, end, [], {
        dialog: `End devMode (${appName}/${workLoadName}) fail`,
      });
    }
  );
}

export async function loadResource(
  host: Host,
  kubeConfigPath: string,
  namespace: string,
  appName: string
) {
  const describeCommand = nhctlCommand(
    kubeConfigPath,
    namespace,
    `describe ${appName}`
  );
  // host.log(`[cmd] ${describeCommand}`, true);
  const result = await execAsyncWithReturn(describeCommand, []);
  return result.stdout;
}

export async function getAppInfo(
  kubeConfigPath: string,
  namespace: string,
  appName: string
) {
  const describeCommand = nhctlCommand(
    kubeConfigPath,
    namespace,
    `describe ${appName}`
  );
  const result = await execAsyncWithReturn(describeCommand, []);
  return result.stdout;
}

export async function getServiceConfig(
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  workloadName: string,
  type?: string
) {
  const describeCommand = nhctlCommand(
    kubeConfigPath,
    namespace,
    `describe ${appName} -d ${workloadName} ${type ? `--type ${type}` : ""}`
  );
  const result = await execAsyncWithReturn(describeCommand, []);
  let svcProfile: SvcProfile | null = null;
  if (result && result.stdout) {
    try {
      svcProfile = yaml.parse(result.stdout) as SvcProfile;
    } catch (error) {
      logger.info("command: " + describeCommand + "result: ", result.stdout);
      throw error;
    }
  }

  return svcProfile;
}

export async function printAppInfo(
  host: Host,
  kubeconfigPath: string,
  namespace: string,
  appName: string
) {
  const printAppCommand = nhctlCommand(
    kubeconfigPath,
    namespace,
    `list ${appName}`
  );
  host.log(`[cmd] ${printAppCommand}`, true);
  await execChildProcessAsync(host, printAppCommand, []);
}

// ~/.nh/bin/nhctl profile get bookinfo-coding -d centos-01 --container xxx  --key image -t xxx  -n xxx --kubeconfig xxx
export async function getImageByContainer(props: {
  kubeConfigPath: string;
  namespace: string;
  appName: string;
  workloadName: string;
  containerName: string;
  workloadType: string;
}): Promise<{
  image: string;
} | null> {
  const {
    appName,
    workloadName,
    kubeConfigPath,
    containerName,
    workloadType,
    namespace,
  } = props;
  const configCommand = nhctlCommand(
    kubeConfigPath,
    namespace,
    `profile get ${appName} -d ${workloadName || ""} --container ${
      containerName || ""
    } --key image -t ${workloadType.toLowerCase()}`
  );
  const result = await execAsyncWithReturn(configCommand, []);
  try {
    return JSON.parse(result.stdout);
  } catch (e) {
    console.log(e);
    return null;
  }
}

export async function profileConfig(props: {
  kubeConfigPath: string;
  namespace: string;
  appName: string;
  containerName: string;
  workloadType: string;
  workloadName: string;
  key: string;
  value: string;
}) {
  const {
    value,
    workloadType,
    containerName,
    key,
    workloadName,
    kubeConfigPath,
    namespace,
    appName,
  } = props;
  const command = nhctlCommand(
    kubeConfigPath,
    namespace,
    `profile set ${appName} -d ${
      workloadName || ""
    } -t ${workloadType.toLowerCase()} --container ${
      containerName || ""
    } --key ${key} --value ${value}`
  );
  const result = await execAsyncWithReturn(command, []);
  return result;
}

export async function getConfig(
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  workloadName?: string,
  workloadType?: string
) {
  const configCommand = nhctlCommand(
    kubeConfigPath,
    namespace,
    `config get ${appName} ${workloadName ? `-d ${workloadName}` : ""} ${
      workloadType ? `-t ${workloadType.toLowerCase()}` : ""
    }`
  );
  const result = await execAsyncWithReturn(configCommand, []);
  return result.stdout;
}

export async function editConfig(
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  workloadName: string | undefined | null,
  workloadType: string | undefined | null,
  contents: string
) {
  const configCommand = nhctlCommand(
    kubeConfigPath,
    namespace,
    `config edit ${appName} ${workloadName ? `-d ${workloadName}` : ""} ${
      workloadType ? `-t ${workloadType.toLowerCase()}` : ""
    } -c ${contents}`
  );
  const result = await execAsyncWithReturn(configCommand, []);
  return result.stdout;
}

export async function getAppConfig(
  kubeConfigPath: string,
  namespace: string,
  appName: string
) {
  const configCommand = nhctlCommand(
    kubeConfigPath,
    namespace,
    `config get ${appName} --app-config`
  );
  const result = await execAsyncWithReturn(configCommand, []);
  return result.stdout;
}

export async function editAppConfig(
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  contents: string
) {
  const configCommand = nhctlCommand(
    kubeConfigPath,
    namespace,
    `config edit ${appName} --app-config -c ${contents}`
  );
  const result = await execAsyncWithReturn(configCommand, []);
  return result.stdout;
}

export async function resetApp(
  kubeConfigPath: string,
  namespace: string,
  appName: string
) {
  await host.showProgressing(`Reset : ${appName}`, async (progress) => {
    const resetCommand = nhctlCommand(kubeConfigPath, namespace, `reset`);
    host.log(`[cmd] ${resetCommand}`, true);
    await execChildProcessAsync(host, resetCommand, [], {
      dialog: `reset (${appName}) fail`,
    });
  });
}

export async function resetService(
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  workloadName: string,
  workloadType: string
) {
  await host.showProgressing(
    `Reset : ${appName}/${workloadName}`,
    async (progress) => {
      const resetCommand = nhctlCommand(
        kubeConfigPath,
        namespace,
        `dev reset ${appName} -d ${workloadName} -t ${workloadType.toLowerCase()}`
      );
      host.log(`[cmd] ${resetCommand}`, true);
      await execChildProcessAsync(host, resetCommand, [], {
        dialog: `reset (${appName}/${workloadName}) fail`,
      });
    }
  );
}

export async function getTemplateConfig(
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  workloadName: string
) {
  const configCommand = nhctlCommand(
    kubeConfigPath,
    namespace,
    `config template ${appName} -d ${workloadName}`
  );
  const result = await execAsyncWithReturn(configCommand, []);
  return result.stdout;
}

export async function listPVC(
  props: IBaseCommand<{
    appName: string;
    workloadName?: string;
  }>
) {
  const { kubeConfigPath, namespace, appName, workloadName } = props;
  const configCommand = nhctlCommand(
    kubeConfigPath,
    namespace,
    `pvc list --app ${appName} ${
      workloadName ? `--svc ${workloadName}` : ""
    } --yaml`
  );
  const result = await execAsyncWithReturn(configCommand, []);
  let pvcs: IPvc[] = [];
  try {
    pvcs = yaml.parse(result.stdout) as Array<IPvc>;
  } catch (error) {
    logger.info("command: " + configCommand + "result: ", result.stdout);
    throw error;
  }
  return pvcs;
}

export async function cleanPVC(
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  workloadName?: string,
  pvcName?: string
) {
  const cleanCommand = nhctlCommand(
    kubeConfigPath,
    namespace,
    `pvc clean --app ${appName} ${
      workloadName ? `--svc ${workloadName}` : ""
    } ${pvcName ? `--name ${pvcName}` : ""}`
  );
  host.log(`[cmd] ${cleanCommand}`, true);
  await execChildProcessAsync(host, cleanCommand, [], {
    dialog: `Clear pvc (${appName}/${workloadName}) fail`,
  });
}

export async function getSyncStatus(
  resourceType: string,
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  workloadName: string
) {
  const syncCommand = nhctlCommand(
    kubeConfigPath,
    namespace,
    `sync-status ${appName} -d ${workloadName} -t ${resourceType}`
  );
  let result: ShellResult = {
    stdout: "",
    stderr: "",
    code: 0,
  };
  const r = (await execAsyncWithReturn(syncCommand, []).catch((e) => {
    logger.info("Nocalhost.syncService syncCommand");
    logger.error(e);
  })) as ShellResult;

  if (r) {
    result = r;
  }

  return result.stdout;
}

export async function overrideSyncFolders(
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  workloadName: string
) {
  const overrideSyncCommand = nhctlCommand(
    kubeConfigPath,
    namespace,
    `sync-status ${appName} -d ${workloadName} --override`
  );
  host.log(`[cmd] ${overrideSyncCommand}`);
  await execChildProcessAsync(host, overrideSyncCommand, []);
}

export async function reconnectSync(
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  workloadName: string
) {
  // nhctl sync coding-operation -d platform-login  --kubeconfig /Users/weiwang/.nh/plugin/kubeConfigs/12_354_config --resume
  const reconnectSyncCommand = nhctlCommand(
    kubeConfigPath,
    namespace,
    `sync ${appName} -d ${workloadName} --resume`
  );
  host.log(`[cmd] ${reconnectSyncCommand}`);
  await execChildProcessAsync(host, reconnectSyncCommand, [], {
    output: "reconnected sync service",
    dialog: "reconnected sync service",
  });
}

function getNhctlPath(version: string) {
  const isLinux = host.isLinux();
  const isMac = host.isMac();
  const isWindows = host.isWindow();
  let sourcePath = "";
  let destinationPath = "";
  let binPath = "";
  if (isLinux) {
    sourcePath = `https://codingcorp-generic.pkg.coding.net/nocalhost/nhctl/nhctl-linux-amd64?version=v${version}`;
    destinationPath = path.resolve(PLUGIN_TEMP_DIR, "nhctl");
    binPath = path.resolve(NH_BIN, "nhctl");
  } else if (isMac) {
    sourcePath = `https://codingcorp-generic.pkg.coding.net/nocalhost/nhctl/nhctl-darwin-amd64?version=v${version}`;
    destinationPath = path.resolve(PLUGIN_TEMP_DIR, "nhctl");
    binPath = path.resolve(NH_BIN, "nhctl");
  } else if (isWindows) {
    sourcePath = `https://codingcorp-generic.pkg.coding.net/nocalhost/nhctl/nhctl-windows-amd64.exe?version=v${version}`;
    destinationPath = path.resolve(PLUGIN_TEMP_DIR, "nhctl.exe");
    binPath = path.resolve(NH_BIN, "nhctl.exe");
  }

  return {
    sourcePath,
    binPath,
    destinationPath,
  };
}

export async function checkDownloadNhclVersion(
  version: string,
  nhctlPath: string = NH_BIN
) {
  const tempVersion: string = await services.fetchNhctlVersion(nhctlPath);
  return tempVersion === version;
}

function setUpgrade(isUpgrade: boolean) {
  const KEY = "nhctl.upgrade";

  if (isUpgrade) {
    host.setGlobalState(KEY, true);
    host.stopAutoRefresh();
  } else {
    host.removeGlobalState(KEY);
    host.startAutoRefresh();
  }

  vscode.commands.executeCommand(
    "setContext",
    "extensionActivated",
    !isUpgrade
  );
  vscode.commands.executeCommand("setContext", KEY, isUpgrade);
}

export async function checkVersion() {
  if (getConfiguration("nhctl.checkVersion") === false) {
    return;
  }

  const requiredVersion: string = packageJson.nhctl?.version;

  if (!requiredVersion) {
    return;
  }

  const { sourcePath, destinationPath, binPath } = getNhctlPath(
    requiredVersion
  );

  const currentVersion: string = await services.fetchNhctlVersion();

  // currentVersion < requiredVersion
  const isUpdateNhctl =
    currentVersion && semver.lt(currentVersion, requiredVersion);

  if (currentVersion && !isUpdateNhctl) {
    return;
  }

  let failedMessage = "Download failed, Please try again";
  let completedMessage = "Download completed";
  let progressingTitle = "Downloading nhctl...";

  if (isUpdateNhctl) {
    failedMessage = `Update failed, please delete ${binPath} file and try again`;
    completedMessage = "Update completed";
    progressingTitle = `Update nhctl to ${requiredVersion}...`;
  }

  try {
    await lock();
    setUpgrade(true);

    await host.showProgressing(progressingTitle, async (aciton) => {
      await downloadNhctl(sourcePath, destinationPath, (increment) => {
        aciton.report({ increment });
      });

      // windows A lot of Windows Defender firewall warnings #167
      if (isUpdateNhctl && host.isWindow()) {
        if (fs.existsSync(TEMP_NHCTL_BIN)) {
          fs.unlinkSync(TEMP_NHCTL_BIN);
        }
        fs.renameSync(binPath, TEMP_NHCTL_BIN);
      }

      fs.renameSync(destinationPath, binPath);

      if (!(await checkDownloadNhclVersion(requiredVersion))) {
        vscode.window.showErrorMessage(failedMessage);
      } else {
        vscode.window.showInformationMessage(completedMessage);
      }
    });
  } catch (err) {
    console.error(err);
    vscode.window.showErrorMessage(failedMessage);
  } finally {
    setUpgrade(false);
    unlock();
  }
}

export async function cleanPvcByDevSpace(
  props: IBaseCommand & {
    pvcName: string;
  }
) {
  const { pvcName, kubeConfigPath, namespace } = props;
  const command = nhctlCommand(
    kubeConfigPath,
    namespace,
    `pvc clean ${pvcName ? `--name ${pvcName}` : ""}`
  );
  const result = await execAsyncWithReturn(command, []);

  return result;
}

export async function getPVCbyDevSpace(props: IBaseCommand): Promise<IPvc[]> {
  const { kubeConfigPath, namespace } = props;
  const command = nhctlCommand(kubeConfigPath, namespace, `pvc list  --json`);
  const result = await execAsyncWithReturn(command, []);
  if (result.stdout) {
    try {
      return keysToCamel(JSON.parse(result.stdout));
    } catch (e) {
      logger.error(e);
    }
  }
  return null;
}

export function nhctlCommand(
  kubeconfigPath: string,
  namespace: string,
  baseCommand: string
) {
  const nhctlPath = path.resolve(
    NH_BIN,
    host.isWindow() ? "nhctl.exe" : "nhctl"
  );
  const command = `${nhctlPath} ${baseCommand} ${
    namespace ? `-n ${namespace}` : ""
  } --kubeconfig ${kubeconfigPath}`;
  console.log(command);
  return command;
}

export async function checkCluster(
  kubeConfigPath: string
): Promise<KubeConfigState> {
  const result = await NhctlCommand.create("check cluster --timeout 10", {
    kubeConfigPath: kubeConfigPath,
  })
    .toJson()
    .exec();

  return result;
}
