import {
  DEV_VERSION,
  GLOBAL_TIMEOUT,
  PLUGIN_TEMP_DIR,
  TEMP_NHCTL_BIN,
} from "./../../constants";
import * as vscode from "vscode";
import * as semver from "semver";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { spawn } from "child_process";

import { exec, ExecParam, execWithProgress, getExecCommand } from "../shell";
import host, { Host } from "../../host";
import * as yaml from "yaml";
import { get as _get, orderBy } from "lodash";
import { readYaml, replaceSpacePath } from "../../utils/fileUtil";
import * as packageJson from "../../../../package.json";
import { NH_BIN } from "../../constants";
import services from "../../common/DataCenter/services";
import { SvcProfile, NodeInfo } from "../../nodes/types/nodeType";
import logger from "../../utils/logger";
import { IDevSpaceInfo } from "../../domain";
import { Resource, ResourceStatus } from "../../nodes/types/resourceType";
import { downloadNhctl, lock, unlock } from "../../utils/download";
import { keysToCamel } from "../../utils";
import { IPvc } from "../../domain";
import { getBooleanValue } from "../../utils/config";
import messageBus from "../../utils/messageBus";
import { ClustersState } from "../../clusters";
import { Associate, IPortForward } from "./type";
import state from "../../state";

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
  private argTheTail: string = null;
  public static nhctlPath: string = path.resolve(
    NH_BIN,
    host.isWindow() ? "nhctl.exe" : "nhctl"
  );
  private outputMethod: string = "toJson";

  constructor(
    base: string,
    private baseParams?: IBaseCommand<unknown>,
    private execParam: Omit<ExecParam, "command"> = {},
    public args: string[] = []
  ) {
    this.baseCommand = `${NhctlCommand.nhctlPath} ${base || ""}`;
  }
  static create(
    base: string,
    baseParams?: IBaseCommand<unknown>,
    execParam: Omit<ExecParam, "command"> = {},
    args: string[] = []
  ) {
    return new NhctlCommand(base, baseParams, execParam, args);
  }
  static get(baseParams?: IBaseCommand<unknown>, ms = GLOBAL_TIMEOUT) {
    const command = NhctlCommand.create("get", baseParams);
    command.execParam.timeout = ms;

    return command;
  }
  static dev(
    baseParams?: IBaseCommand<unknown>,
    execParam: Omit<ExecParam, "command"> = {},
    args: string[] = []
  ) {
    const command = NhctlCommand.create("dev", baseParams, execParam, args);
    command.execParam = execParam;

    return command;
  }
  static kExec(baseParams?: IBaseCommand<{ args?: string[] }>) {
    const command = NhctlCommand.create("k exec", baseParams);
    command.args = baseParams.args ?? [];

    return command;
  }

  static exec(
    params: IBaseCommand<{
      args?: string[];
      app: string;
      name: string;
      resourceType: string;
      container?: string;
      shell?: string;
      commands: string[];
    }>
  ) {
    let { args, app, name, resourceType, container, commands, shell } = params;

    const command = NhctlCommand.create("exec", params);

    args = args ?? [];

    args.unshift(
      app,
      `-d ${name}`,
      `-t ${resourceType}`,
      `--container ${container ?? "nocalhost-dev"}`,
      `--command ${shell || "sh"}`,
      `--command -c`,
      `--command "${commands.join(" ")}"`
    );

    command.args = args;
    return command;
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
    nhctlCommand.execParam.output = true;

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
    const result = await exec({ command, ...this.execParam }).promise;

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

export async function getPortForwardList(
  props: IBaseCommand<{
    appName: string;
  }>
): Promise<IPortForward[]> {
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
  let obj: AllInstallAppInfo[] = await NhctlCommand.get({
    kubeConfigPath: kubeconfig,
  })
    .addArgument("app")
    .addArgumentStrict("-o", "yaml")
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
  let command = nhctlCommand(
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
    command = nhctlCommand(
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
    command = nhctlCommand(
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
    command += ` ${
      installType === "helmRepo" ? "--helm-repo-version" : "-r"
    } ${refOrVersion}`;
  }

  return execWithProgress({
    title: `Installing application: ${appName}`,
    command,
  }).catch(() => {
    return Promise.reject(new Error(`Install application (${appName}) fail`));
  });
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
  let command = nhctlCommand(
    kubeconfigPath,
    namespace,
    `upgrade ${appName} ${
      gitUrl && gitUrl.trim() ? `-u ${gitUrl}` : ""
    } ${resourcePath} ${appConfig ? "--config " + appConfig : ""}`
  );

  if (appType === "helmRepo") {
    command = nhctlCommand(
      kubeconfigPath,
      namespace,
      `upgrade ${appName} --helm-chart-name ${appName} --helm-repo-url ${gitUrl}`
    );
  } else if (["helmLocal", "rawManifestLocal"].includes(appType)) {
    command += ` --local-path=${local && local.localPath} --config ${
      local && local.config
    }`;
  }

  if (refOrVersion) {
    command += ` ${
      appType === "helmRepo" ? "--helm-repo-version" : "-r"
    } ${refOrVersion}`;
  }

  if (valuesPath) {
    command = `${command} -f ${valuesPath}`;
  }

  if (valueStr) {
    command = `${command} --set ${valueStr}`;
  }

  host.log("cmd: " + command, true);

  return execWithProgress({
    title: `Upgrade application: ${appName}`,
    command,
  }).catch(() => {
    host.showErrorMessage(`upgrade application (${appName}) fail`);
    return Promise.reject();
  });
}

export async function associate(
  kubeconfigPath: string,
  namespace: string,
  appName: string,
  dir: string,
  type: string,
  workLoadName: string,
  container?: string,
  params: "--de-associate" | "--migrate" | "" = ""
) {
  const resultDir = replaceSpacePath(dir);

  const command = nhctlCommand(
    kubeconfigPath,
    namespace,
    `dev associate ${appName} -s ${resultDir} ${
      container ? `-c ${container}` : ""
    } -t ${type} -d ${workLoadName} ${params}`
  );
  const result = await exec({ command }).promise;
  return result.stdout;
}

export async function associateInfo(
  kubeconfigPath: string,
  namespace: string,
  appName: string,
  type: string,
  workLoadName: string,
  container: string,
  params = ""
) {
  const command = nhctlCommand(
    kubeconfigPath,
    namespace,
    `dev associate ${appName} -c ${container} -t ${type} -d ${workLoadName} ${params} --info`
  );

  const result = await exec({ command }).promise;
  return result.stdout;
}

export async function uninstall(
  host: Host,
  kubeconfigPath: string,
  namespace: string,
  appName: string,
  force?: boolean
) {
  const command = nhctlCommand(
    kubeconfigPath,
    namespace,
    `uninstall ${appName} ${force ? `--force` : ""}`
  );

  const title = `Uninstalling application: ${appName}`;
  return execWithProgress({
    command,
    title,
  }).catch(() => {
    return Promise.reject(new Error(`${title} fail`));
  });
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
  mode: "copy" | "replace",
  container?: string,
  storageClass?: string,
  devStartAppendCommand?: string,
  image?: string
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
  const command = nhctlCommand(
    kubeconfigPath,
    namespace,
    `dev start ${appName} -d ${workLoadName} -t ${workloadType.toLowerCase()} ${
      mode === "copy" ? "-m duplicate" : ""
    } --without-terminal  ${options} ${
      devStartAppendCommand ? devStartAppendCommand : ""
    } ${image ? `-i ${image}` : ""}`
  );

  return execWithProgress({
    title: "Starting DevMode",
    command,
  }).catch(() => {
    host.showErrorMessage(`Start devMode (${appName}/${workLoadName}) fail`);
    return Promise.reject();
  });
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

function sudoPortForward(command: string) {
  command = getExecCommand(command);

  return new Promise((resolve, reject) => {
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
  let command = nhctlCommand(
    kubeconfigPath,
    namespace,
    `port-forward start ${appName} -d ${workloadName} ${portOptions} ${
      resourceType ? `--type ${resourceType}` : ""
    } ${pod ? `--pod ${pod}` : ""}`
  );

  const sudo = isSudo(ports);

  if (sudo) {
    host.log(`[cmd] ${sudo ? `sudo -S ${command}` : command}`, true);

    return await sudoPortForward(`sudo -S ${command}`);
  }

  const title = `Starting port-forward`;

  await execWithProgress({
    title,
    command,
  }).catch(() => {
    return Promise.reject(
      new Error(`Port-forward (${appName}/${workloadName}) fail`)
    );
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
  const command = NhctlCommand.portForward(props)
    .addArgument("end", appName)
    .addArgumentStrict("-d", workloadName)
    .addArgumentStrict("-p", port)
    .addArgumentStrict("--type", resourceType)
    .getCommand();

  const sudo = isSudo([port]);

  if (sudo) {
    host.log(`[cmd] sudo -S ${command}`, true);
    await sudoPortForward(`sudo -S ${command}`);
  } else {
    await execWithProgress({
      command,
      title: `End port-forward (${appName}/${workloadName})`,
    }).catch(() => {
      return Promise.reject(
        new Error(`End port-forward (${appName}/${workloadName}) fail`)
      );
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
  const command = nhctlCommand(kubeconfigPath, namespace, baseCommand);

  host.log(`[cmd] ${command}`, true);

  await exec({ command }).promise.catch(() => {
    host.showErrorMessage(`Syncronize file (${appName}/${workloadName}) fail`);
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
  const command = nhctlCommand(
    kubeconfigPath,
    namespace,
    `dev end ${appName} -d ${workLoadName} ${
      workloadType ? `-t ${workloadType.toLowerCase()}` : ""
    }`
  );

  const title = `Ending DevMode: ${appName}/${workLoadName}`;

  await execWithProgress({ command, title }).catch(() => {
    host.showErrorMessage(`${title} fail`);
    return Promise.reject();
  });
}

export async function loadResource(
  host: Host,
  kubeConfigPath: string,
  namespace: string,
  appName: string
) {
  const command = nhctlCommand(
    kubeConfigPath,
    namespace,
    `describe ${appName}`
  );
  const result = await exec({ command }).promise;
  return result.stdout;
}

export async function getAppInfo(
  kubeConfigPath: string,
  namespace: string,
  appName: string
) {
  const command = nhctlCommand(
    kubeConfigPath,
    namespace,
    `describe ${appName}`
  );

  const result = await exec({ command }).promise;

  return result.stdout;
}

export async function getServiceConfig(
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  workloadName: string,
  type?: string
) {
  const command = nhctlCommand(
    kubeConfigPath,
    namespace,
    `describe ${appName} -d ${workloadName} ${type ? `--type ${type}` : ""}`
  );

  const result = await exec({ command }).promise;

  let svcProfile: SvcProfile | null = null;
  if (result && result.stdout) {
    try {
      svcProfile = yaml.parse(result.stdout) as SvcProfile;
    } catch (error) {
      logger.info("command: " + command + "result: ", result.stdout);
      throw error;
    }
  }

  return svcProfile;
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
  const command = nhctlCommand(
    kubeConfigPath,
    namespace,
    `profile get ${appName} -d ${workloadName || ""} --container ${
      containerName || ""
    } --key image -t ${workloadType.toLowerCase()}`
  );

  const result = await exec({ command }).promise;
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

  const result = await exec({ command }).promise;
  return result;
}

export async function getConfig(
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  workloadName?: string,
  workloadType?: string
) {
  const commands = ["config", "get", appName];

  if (workloadName) {
    commands.push(`-d ${workloadName}`);
  }
  if (workloadType) {
    commands.push(`-t ${workloadType.toLowerCase()}`);
  }

  if (!workloadType && !workloadName) {
    commands.push("--app-config");
  }

  const command = nhctlCommand(kubeConfigPath, namespace, commands.join(" "));

  const result = await exec({ command }).promise;
  return result.stdout;
}

export async function editConfig(
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  contents: Buffer,
  workloadName?: string,
  workloadType?: string
) {
  const commands = ["config", "edit", appName, "-f -"];

  if (workloadName) {
    commands.push(`-d ${workloadName}`);
  }
  if (workloadType) {
    commands.push(`-t ${workloadType.toLowerCase()}`);
  }

  if (!workloadType && !workloadName) {
    commands.push("--app-config");
  }

  const command = nhctlCommand(kubeConfigPath, namespace, commands.join(" "));

  const { proc, promise } = await exec({ command });
  proc.stdin.write(contents);
  proc.stdin.end();

  return await (await promise).stdout;
}

export async function resetApp(
  kubeConfigPath: string,
  namespace: string,
  appName: string
) {
  const command = nhctlCommand(kubeConfigPath, namespace, `reset`);
  const title = `Reset : ${appName}`;

  await execWithProgress({
    command,
    title,
  }).catch(() => {
    return Promise.reject(new Error(`${title} fail`));
  });
}

export async function resetService(
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  workloadName: string,
  workloadType: string
) {
  const command = nhctlCommand(
    kubeConfigPath,
    namespace,
    `dev reset ${appName} -d ${workloadName} -t ${workloadType.toLowerCase()}`
  );
  const title = `Reset : ${appName}/${workloadName}`;

  await execWithProgress({ title, command }).catch(() => {
    host.showErrorMessage(`${title} fail`);

    return Promise.reject(new Error(`${title} fail`));
  });
}

export async function getTemplateConfig(
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  workloadName: string
) {
  const command = nhctlCommand(
    kubeConfigPath,
    namespace,
    `config template ${appName} -d ${workloadName}`
  );

  const result = await exec({ command }).promise;
  return result.stdout;
}

export async function listPVC(
  props: IBaseCommand<{
    appName: string;
    workloadName?: string;
  }>
) {
  const { kubeConfigPath, namespace, appName, workloadName } = props;
  const command = nhctlCommand(
    kubeConfigPath,
    namespace,
    `pvc list --app ${appName} ${
      workloadName ? `--svc ${workloadName}` : ""
    } --yaml`
  );
  const result = await exec({ command }).promise;
  let pvcs: IPvc[] = [];
  try {
    pvcs = yaml.parse(result.stdout) as Array<IPvc>;
  } catch (error) {
    logger.info("command: " + command + "result: ", result.stdout);
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
  const command = nhctlCommand(
    kubeConfigPath,
    namespace,
    `pvc clean --app ${appName} ${
      workloadName ? `--controller ${workloadName}` : ""
    } ${pvcName ? `--name ${pvcName}` : ""}`
  );
  host.log(`[cmd] ${command}`, true);

  await exec({ command }).promise.catch(() => {
    host.showErrorMessage(`Clear pvc (${appName}/${workloadName}) fail`);
  });
}

export async function getSyncStatus(
  resourceType: string,
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  workloadName: string,
  args: string[] = []
) {
  let baseCommand = "sync-status ";
  if (appName) {
    baseCommand += `${appName} -d ${workloadName} -t ${resourceType}`;
  }

  const command = nhctlCommand(kubeConfigPath, namespace, baseCommand);

  const r = await exec({ command, args, printCommand: false }).promise.catch(
    () => {
      return { code: 0, stdout: "", stderr: "" };
    }
  );

  return r.stdout;
}

export async function overrideSyncFolders(
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  workloadName: string,
  controllerType: string
) {
  const command = nhctlCommand(
    kubeConfigPath,
    namespace,
    `sync-status ${appName} -d ${workloadName} -t ${controllerType} --override`
  );

  await exec({ command });
}
export async function reconnectSync(
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  workloadName: string,
  controllerType: string
) {
  // nhctl sync coding-operation -d platform-login  --kubeconfig /Users/weiwang/.nh/plugin/kubeConfigs/12_354_config --resume
  const command = nhctlCommand(
    kubeConfigPath,
    namespace,
    `sync ${appName} -d ${workloadName} -t ${controllerType} --resume`
  );
  host.log(`[cmd] ${command}`, true);

  await exec({
    command,
  }).promise.catch(() => {
    host.showErrorMessage("reconnected sync service");
  });
}

function getNhctlPath(version: string) {
  let name = "";
  let destinationPath = path.resolve(PLUGIN_TEMP_DIR, "nhctl");
  let binPath = path.resolve(NH_BIN, "nhctl");

  if (host.isLinux()) {
    name = `nhctl-linux-amd64`;
  } else if (host.isMac()) {
    if (os.arch() === "arm64") {
      name = `nhctl-darwin-arm64`;
    } else {
      name = `nhctl-darwin-amd64`;
    }
  } else if (host.isWindow()) {
    name = `nhctl-windows-amd64.exe`;
    destinationPath = path.resolve(PLUGIN_TEMP_DIR, "nhctl.exe");
    binPath = path.resolve(NH_BIN, "nhctl.exe");
  }

  let versionName = version;
  if (version !== DEV_VERSION) {
    versionName = "v" + version;
  }

  return {
    sourcePath: [
      `https://nocalhost-generic.pkg.coding.net/nocalhost/nhctl/${name}?version=${versionName}`,
      `https://github.com/nocalhost/nocalhost/releases/download/${versionName}/${name}`,
    ],
    binPath,
    destinationPath,
  };
}

export async function checkDownloadNhctlVersion(
  version: string,
  nhctlPath: string = NH_BIN
) {
  const tempVersion: string = await services.fetchNhctlVersion(nhctlPath);

  if (version === DEV_VERSION) {
    version = undefined;
  }

  return tempVersion === version;
}

function setUpgrade(isUpgrade: boolean) {
  const KEY = "nhctl.upgrade";

  if (isUpgrade) {
    host.setGlobalState(KEY, true);
    state.stopAutoRefresh();
  } else {
    host.removeGlobalState(KEY);
    state.startAutoRefresh();
  }

  vscode.commands.executeCommand(
    "setContext",
    "extensionActivated",
    !isUpgrade
  );
  vscode.commands.executeCommand("setContext", KEY, isUpgrade);
}

export async function checkVersion() {
  const requiredVersion: string = packageJson.nhctl?.version;
  // is dev plugin
  const pluginVersion: string = packageJson.version;

  const { sourcePath, destinationPath, binPath } = getNhctlPath(
    requiredVersion
  );

  if (
    !getBooleanValue("nhctl.checkVersion") ||
    !requiredVersion ||
    (pluginVersion.indexOf("-beta") > -1 && fs.existsSync(binPath))
  ) {
    return;
  }

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

    await host.showProgressing(progressingTitle, async (acton) => {
      await downloadNhctl(sourcePath, destinationPath, (increment) => {
        acton.report({ increment });
      });

      // windows A lot of Windows Defender firewall warnings #167
      if (isUpdateNhctl && host.isWindow()) {
        if (fs.existsSync(TEMP_NHCTL_BIN)) {
          fs.unlinkSync(TEMP_NHCTL_BIN);
        }
        messageBus.emit("install", {
          status: "loading",
        });
        let command = "taskkill /im nhctl.exe -f";

        await exec({ command }).promise.catch((e) => {
          logger.error(command, e);
        });

        command = "tasklist | findstr nhctl.exe";

        const result = await exec({ command }).promise.catch((e) => {
          logger.error(command, e);
        });

        if (!result) {
          logger.info("after kill has not daemon");
        } else {
          logger.info("after kill has daemon");
          await exec({ command }).promise.catch((e) => {
            logger.error(command, e);
          });
        }
        fs.renameSync(binPath, TEMP_NHCTL_BIN);
      }

      fs.renameSync(destinationPath, binPath);

      setTimeout(async () => {
        if (!(await checkDownloadNhctlVersion(requiredVersion))) {
          vscode.window.showErrorMessage(failedMessage);
        } else {
          vscode.window.showInformationMessage(completedMessage);
        }
      }, 300);
    });
  } catch (err) {
    // host.log(`[update err] ${err}`, true);
    console.error("checkVersion", err);
    typeof err === "string" && err.indexOf("lockerror") !== -1
      ? logger.error("lockerror")
      : vscode.window.showErrorMessage(failedMessage);
  } finally {
    setUpgrade(false);
    unlock();
    messageBus.emit("install", {
      status: "end",
    });
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

  const result = await exec({ command }).promise;

  return result;
}

export async function getPVCbyDevSpace(props: IBaseCommand): Promise<IPvc[]> {
  const { kubeConfigPath, namespace } = props;
  const command = nhctlCommand(kubeConfigPath, namespace, `pvc list  --json`);
  const result = await exec({ command }).promise;
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
  const command = `${NhctlCommand.nhctlPath} ${baseCommand} ${
    namespace ? `-n ${namespace}` : ""
  } ${kubeconfigPath ? `--kubeconfig ${kubeconfigPath}` : ""}`;
  return command;
}

export async function checkCluster(
  kubeConfigPath: string,
  timeout = 10
): Promise<ClustersState> {
  const result = await NhctlCommand.create(
    `check cluster --timeout ${timeout}`,
    {
      kubeConfigPath: kubeConfigPath,
    }
  )
    .toJson()
    .exec();

  return result;
}

export async function kubeconfig(
  kubeConfigPath: string,
  command: "add" | "remove"
) {
  const result = await NhctlCommand.create(`kubeconfig ${command}`, {
    kubeConfigPath,
  })
    .toJson()
    .exec();

  logger.debug(`kubeconfig ${command}:${kubeConfigPath}`);

  return result;
}

export async function devTerminal(
  appName: string,
  workloadName: string,
  workloadType: string,
  container: string | null,
  kubeConfigPath: string,
  namespace: string,
  pod: string | null
) {
  const shellArgs = ["dev", "terminal", appName];

  shellArgs.push("-d", workloadName);
  shellArgs.push("-t", workloadType);
  shellArgs.push("--kubeconfig", kubeConfigPath);
  shellArgs.push("-n", namespace);

  if (pod) {
    shellArgs.push("--pod", pod);
  }
  if (container) {
    shellArgs.push("--container", container);
  }

  const terminal = host.createTerminal({
    shellPath: NhctlCommand.nhctlPath,
    shellArgs,
    name: `${appName}-${workloadName}`,
    iconPath: {
      id: "vm-connect",
    },
  });
  terminal.show();

  return terminal;
}

export async function getContainers(node: NodeInfo): Promise<string[]> {
  const { appName, name, resourceType, namespace, kubeConfigPath } = node;
  const result = await NhctlCommand.create(
    `dev containers ${appName} -d ${name} -t ${resourceType} -n ${namespace} --kubeconfig ${kubeConfigPath}`
  )
    .toJson()
    .exec();
  return result;
}

export async function associateQuery(param: {
  localSync?: string;
  current?: boolean;
}): Promise<Associate.QueryResult[] | Associate.QueryResult> {
  const args = ["associate-queryer"];

  if (!param.localSync) {
    param.localSync = host.getCurrentRootPath();
  }

  args.push(`--local-sync ${param.localSync}`);

  if (param.current === true) {
    args.push("--current");
  }

  return NhctlCommand.dev(null, null, args)
    .addArgument("--json")
    .toJson()
    .exec();
}
