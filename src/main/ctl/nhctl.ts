import * as vscode from "vscode";
import * as semver from "semver";
import * as path from "path";
import * as fs from "fs";
import { spawn } from "child_process";
import * as request from "request";

import {
  execAsyncWithReturn,
  execChildProcessAsync,
  ShellResult,
} from "./shell";
import host, { Host } from "../host";
import * as yaml from "yaml";
import { readYaml } from "../utils/fileUtil";
import * as packageJson from "../../../package.json";
import { NH_BIN, NOCALHOST_INSTALLATION_LINK } from "../constants";
import services, { ServiceResult } from "../common/DataCenter/services";
import { SvcProfile } from "../nodes/types/nodeType";
import logger from "../utils/logger";

export interface InstalledAppInfo {
  name: string;
  type: string;
}

export interface AllInstallAppInfo {
  namespace: string;
  application: Array<InstalledAppInfo>;
}

export async function getInstalledApp(
  ns: string,
  kubeconfig: string
): Promise<AllInstallAppInfo[]> {
  const nhctlPath = path.resolve(
    NH_BIN,
    host.isWindow() ? "nhctl.exe" : "nhctl"
  );
  const command = `${nhctlPath} list --yaml -n ${ns} --kubeconfig ${kubeconfig}`;
  const result = await execAsyncWithReturn(command, []);

  let obj: AllInstallAppInfo[] = [];

  if (result && result.stdout) {
    try {
      obj = yaml.parse(result.stdout);
    } catch (error) {
      logger.info("command: " + command + "result: ", result.stdout);
      throw error;
    }
  }

  return obj.sort((a, b) => {
    if (a.namespace < b.namespace) {
      return -1;
    }
    if (a.namespace > b.namespace) {
      return 1;
    }
    return 0;
  });
}

export async function install(
  host: Host,
  kubeconfigPath: string,
  namespace: string,
  appName: string,
  appConfig: string,
  helmNHConfigPath: string,
  gitUrl: string,
  installType: string,
  resourceDir: Array<string>,
  local:
    | {
        localPath: string;
        config: string;
      }
    | undefined,
  values?: string,
  valuesStr?: string,
  refOrVersion?: string
) {
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
  refOrVersion?: string
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
    `dev start ${appName} -d ${workLoadName} ${options} ${
      devStartAppendCommand ? devStartAppendCommand : ""
    }`
  );
  host.log(`[cmd] ${devStartCommand}`, true);
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
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  workloadName: string,
  port: string,
  resourceType: string
) {
  // nhctl port-forward end coding-agile -d nginx -p 5006:5005
  const endPortForwardCommand = nhctlCommand(
    kubeConfigPath,
    namespace,
    `port-forward end ${appName} -d ${workloadName} -p ${port} --type ${resourceType}`
  );

  const sudo = isSudo([port]);

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
  container?: string
) {
  let baseCommand = `sync ${appName} -d ${workloadName} ${
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
  workLoadName: string
) {
  await host.showProgressing(
    `Ending DevMode: ${appName}/${workLoadName}`,
    async (progress) => {
      const end = nhctlCommand(
        kubeconfigPath,
        namespace,
        `dev end ${appName} -d ${workLoadName} `
      );
      host.log(`[cmd] ${end}`, true);
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

export async function getConfig(
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  workloadName?: string
) {
  const configCommand = nhctlCommand(
    kubeConfigPath,
    namespace,
    `config get ${appName} ${workloadName ? `-d ${workloadName}` : ""}`
  );
  const result = await execAsyncWithReturn(configCommand, []);
  return result.stdout;
}

export async function editConfig(
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  workloadName: string | undefined | null,
  contents: string
) {
  const configCommand = nhctlCommand(
    kubeConfigPath,
    namespace,
    `config edit ${appName} ${
      workloadName ? `-d ${workloadName}` : ""
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
  workloadName: string
) {
  await host.showProgressing(
    `Reset : ${appName}/${workloadName}`,
    async (progress) => {
      const resetCommand = nhctlCommand(
        kubeConfigPath,
        namespace,
        `dev reset ${appName} -d ${workloadName}`
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

export interface PVCData {
  name: string;
  appName: string;
  serviceName: string;
  capacity: string;
  status: string;
  mountPath: string;
}
export async function listPVC(
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  workloadName?: string
) {
  const configCommand = nhctlCommand(
    kubeConfigPath,
    namespace,
    `pvc list --app ${appName} ${
      workloadName ? `--svc ${workloadName}` : ""
    } --yaml`
  );
  const result = await execAsyncWithReturn(configCommand, []);
  let pvcs: PVCData[] = [];
  try {
    pvcs = yaml.parse(result.stdout) as Array<PVCData>;
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
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  workloadName: string
) {
  const syncCommand = nhctlCommand(
    kubeConfigPath,
    namespace,
    `sync-status ${appName} -d ${workloadName}`
  );
  let result: ShellResult = {
    stdout: "",
    stderr: "",
    code: 0,
  };
  const r = (await execAsyncWithReturn(
    syncCommand,
    []
  ).catch(() => {})) as ShellResult;

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
  if (isLinux) {
    sourcePath = `https://codingcorp-generic.pkg.coding.net/nocalhost/nhctl/nhctl-linux-amd64?version=v${version}`;
    destinationPath = path.resolve(NH_BIN, "nhctl");
  } else if (isMac) {
    sourcePath = `https://codingcorp-generic.pkg.coding.net/nocalhost/nhctl/nhctl-darwin-amd64?version=${version}`;
    destinationPath = path.resolve(NH_BIN, "nhctl");
  } else if (isWindows) {
    sourcePath = `https://codingcorp-generic.pkg.coding.net/nocalhost/nhctl/nhctl-windows-amd64.exe?version=${version}`;
    destinationPath = path.resolve(NH_BIN, "nhctl.exe");
  }

  return {
    sourcePath,
    destinationPath,
  };
}

export async function checkVersion() {
  const requiredVersion: string = packageJson.nhctl?.version;
  const { sourcePath, destinationPath } = getNhctlPath(requiredVersion);
  const result: ServiceResult = await services.fetchNhctlVersion();
  if (!requiredVersion) {
    return;
  }
  if (result.success) {
    let currentVersion: string = "";
    const matched: string[] | null = result.value.match(
      /Version: \s*v(\d+\.\d+\.\d+)/
    );
    if (!matched) {
      return;
    }
    currentVersion = matched[1];
    const isDownloadNhctl: boolean = semver.lt(currentVersion, requiredVersion);
    const isUpgradeExtension: boolean = semver.gt(
      currentVersion,
      requiredVersion
    );

    if (isDownloadNhctl) {
      await host.showProgressing("Downloading nhctl", () => {
        return new Promise((res, rej) => {
          request(sourcePath)
            .pipe(
              fs.createWriteStream(destinationPath as fs.PathLike, {
                mode: 0o755,
              })
            )
            .on("close", () => {
              res(true);
            })
            .on("error", (error: Error) => {
              host.log(error.message + "\n" + error.stack, true);
              rej(error);
            });
        });
      });
    }

    if (isUpgradeExtension) {
      const result:
        | string
        | undefined = await vscode.window.showInformationMessage(
        `Please upgrade extension`
      );
    }
  } else {
    await host.showProgressing("Downloading nhctl", () => {
      return new Promise((res, rej) => {
        request(sourcePath)
          .pipe(
            fs.createWriteStream(destinationPath as fs.PathLike, {
              mode: 0o755,
            })
          )
          .on("close", (code: number) => {
            host.log("download end", true);
            res(true);
          })
          .on("error", (error: Error) => {
            host.log(error.message + "\n" + error.stack, true);
            rej(error);
          });
      });
    });
  }
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
  return `${nhctlPath} ${baseCommand} -n ${namespace} --kubeconfig ${kubeconfigPath}`;
}
