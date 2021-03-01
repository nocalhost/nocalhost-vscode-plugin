import * as vscode from "vscode";
import * as semver from "semver";
import {
  execAsyncWithReturn,
  execChildProcessAsync,
  ShellResult,
} from "./shell";
import host, { Host } from "../host";
import * as yaml from "yaml";
import * as packageJson from "../../../package.json";
import { NOCALHOST_INSTALLATION_LINK } from "../constants";
import services, { ServiceResult } from "../common/DataCenter/services";
import { SvcProfile } from "../nodes/types/nodeType";

export function install(
  host: Host,
  kubeconfigPath: string,
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
    `install ${appName} -u ${gitUrl} -t ${installType} ${
      values ? "-f " + values : ""
    } ${valuesStr ? "--set " + valuesStr : ""} ${resourcePath} ${
      appConfig ? "--config " + appConfig : ""
    }`
  );

  if (installType === "helmRepo") {
    installCommand = nhctlCommand(
      kubeconfigPath,
      `install ${appName} --helm-chart-name ${appName} -t ${installType} ${
        values ? "-f " + values : ""
      } ${valuesStr ? "--set " + valuesStr : ""} --helm-repo-url ${gitUrl} ${
        helmNHConfigPath ? "--outer-config " + helmNHConfigPath : ""
      }`
    );
  } else if (["helmLocal", "rawManifestLocal"].includes(installType)) {
    installCommand = nhctlCommand(
      kubeconfigPath,
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
      return execChildProcessAsync(
        host,
        installCommand,
        [],
        `Install application (${appName}) fail`
      );
    }
  );
}

export async function upgrade(
  kubeconfigPath: string,
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
    `upgrade ${appName} ${
      gitUrl && gitUrl.trim() ? `-u ${gitUrl}` : ""
    } ${resourcePath} ${appConfig ? "--config " + appConfig : ""}`
  );

  if (appType === "helmRepo") {
    upgradeCommand = nhctlCommand(
      kubeconfigPath,
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
      return execChildProcessAsync(
        host,
        upgradeCommand,
        [],
        `upgrade application (${appName}) fail`
      );
    }
  );
}

export async function uninstall(
  host: Host,
  kubeconfigPath: string,
  appName: string
) {
  await host.showProgressing(
    `Uninstalling application: ${appName}`,
    async (progress) => {
      const uninstallCommand = nhctlCommand(
        kubeconfigPath,
        `uninstall ${appName} --force`
      );
      host.log(`[cmd] ${uninstallCommand}`, true);
      await execChildProcessAsync(
        host,
        uninstallCommand,
        [],
        `Uninstall application (${appName}) fail`
      );
    }
  );
}

export async function devStart(
  host: Host,
  kubeconfigPath: string,
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
    `dev start ${appName} -d ${workLoadName} ${options} ${
      devStartAppendCommand ? devStartAppendCommand : ""
    }`
  );
  host.log(`[cmd] ${devStartCommand}`, true);
  await execChildProcessAsync(
    host,
    devStartCommand,
    [],
    `Start devMode (${appName}/${workLoadName}) fail`,
    true
  );
}

export async function startPortForward(
  host: Host,
  kubeconfigPath: string,
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
    `port-forward start ${appName} -d ${workloadName} ${portOptions} ${
      resourceType ? `--type ${resourceType}` : ""
    } ${pod ? `--pod ${pod}` : ""} --way ${way}`
  );

  host.log(`[cmd] ${portForwardCommand}`, true);

  await host.showProgressing(`Starting port-forward`, async (progress) => {
    await execChildProcessAsync(
      host,
      portForwardCommand,
      [],
      `Port-forward (${appName}/${workloadName}) fail`
    );
  });
}

export async function endPortForward(
  appName: string,
  workloadName: string,
  port: string,
  resourceType: string
) {
  // nhctl port-forward end coding-agile -d nginx -p 5006:5005
  const endPortForwardCommand = `nhctl port-forward end ${appName} -d ${workloadName} -p ${port} --type ${resourceType}`;

  host.log(`[cmd] ${endPortForwardCommand}`, true);

  await execChildProcessAsync(
    host,
    endPortForwardCommand,
    [],
    `End port-forward (${appName}/${workloadName}) fail`
  );
}

export async function syncFile(
  host: Host,
  kubeconfigPath: string,
  appName: string,
  workloadName: string
) {
  let baseCommand = `sync ${appName} -d ${workloadName}`;
  const syncFileCommand = nhctlCommand(kubeconfigPath, baseCommand);

  host.log(`[cmd] ${syncFileCommand}`, true);
  await execChildProcessAsync(
    host,
    syncFileCommand,
    [],
    `Syncronize file (${appName}/${workloadName}) fail`
  );
}

export async function endDevMode(
  host: Host,
  kubeconfigPath: string,
  appName: string,
  workLoadName: string
) {
  await host.showProgressing(
    `Ending DevMode: ${appName}/${workLoadName}`,
    async (progress) => {
      const end = nhctlCommand(
        kubeconfigPath,
        `dev end ${appName} -d ${workLoadName} `
      );
      host.log(`[cmd] ${end}`, true);
      host.disposeDebug();
      await execChildProcessAsync(
        host,
        end,
        [],
        `End devMode (${appName}/${workLoadName}) fail`
      );
    }
  );
}

export async function loadResource(host: Host, appName: string) {
  const describeCommand = `nhctl describe ${appName}`;
  // host.log(`[cmd] ${describeCommand}`, true);
  const result = await execAsyncWithReturn(describeCommand, []);
  return result.stdout;
}

export async function getAppInfo(appName: string) {
  const describeCommand = `nhctl describe ${appName}`;
  const result = await execAsyncWithReturn(describeCommand, []);
  return result.stdout;
}

export async function getServiceConfig(
  appName: string,
  workloadName: string,
  type?: string
) {
  const describeCommand = `nhctl describe ${appName} -d ${workloadName} ${
    type ? `--type ${type}` : ""
  }`;
  const result = await execAsyncWithReturn(describeCommand, []);
  let svcProfile: SvcProfile | null = null;
  if (result && result.stdout) {
    svcProfile = yaml.parse(result.stdout) as SvcProfile;
  }

  return svcProfile;
}

export async function printAppInfo(
  host: Host,
  kubeconfigPath: string,
  appName: string
) {
  const printAppCommand = nhctlCommand(kubeconfigPath, `list ${appName}`);
  host.log(`[cmd] ${printAppCommand}`, true);
  await execChildProcessAsync(host, printAppCommand, []);
}

export async function getConfig(appName: string, workloadName?: string) {
  const configCommand = `nhctl config get ${appName} ${
    workloadName ? `-d ${workloadName}` : ""
  }`;
  const result = await execAsyncWithReturn(configCommand, []);
  return result.stdout;
}

export async function editConfig(
  appName: string,
  workloadName: string | undefined | null,
  contents: string
) {
  const configCommand = `nhctl config edit ${appName} ${
    workloadName ? `-d ${workloadName}` : ""
  } -c ${contents}`;
  const result = await execAsyncWithReturn(configCommand, []);
  return result.stdout;
}

export async function resetService(
  kubeConfigPath: string,
  appName: string,
  workloadName: string
) {
  await host.showProgressing(
    `Reset : ${appName}/${workloadName}`,
    async (progress) => {
      const resetCommand = nhctlCommand(
        kubeConfigPath,
        `dev reset ${appName} -d ${workloadName}`
      );
      host.log(`[cmd] ${resetCommand}`, true);
      await execChildProcessAsync(
        host,
        resetCommand,
        [],
        `reset (${appName}/${workloadName}) fail`
      );
    }
  );
}

export async function getTemplateConfig(appName: string, workloadName: string) {
  const configCommand = `nhctl config template ${appName} -d ${workloadName}`;
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
export async function listPVC(appName: string, workloadName?: string) {
  const configCommand = `nhctl pvc list --app ${appName} ${
    workloadName ? `--svc ${workloadName}` : ""
  } --yaml`;
  const result = await execAsyncWithReturn(configCommand, []);
  const pvcs = yaml.parse(result.stdout) as Array<PVCData>;
  return pvcs;
}

export async function cleanPVC(
  appName: string,
  workloadName?: string,
  pvcName?: string
) {
  const cleanCommand = `nhctl pvc clean --app ${appName} ${
    workloadName ? `--svc ${workloadName}` : ""
  } ${pvcName ? `--name ${pvcName}` : ""}`;
  host.log(`[cmd] ${cleanCommand}`, true);
  await execChildProcessAsync(
    host,
    cleanCommand,
    [],
    `Clear pvc (${appName}/${workloadName}) fail`
  );
}

export async function getSyncStatus(appName: string, workloadName: string) {
  const syncCommand = `nhctl sync-status ${appName} -d ${workloadName}`;
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
  appName: string,
  workloadName: string
) {
  const overrideSyncCommand = `nhctl sync-status ${appName} -d ${workloadName} --override`;
  host.log(`[cmd] ${overrideSyncCommand}`);
  await execChildProcessAsync(host, overrideSyncCommand, []);
}

export async function checkVersion() {
  const requiredVersion: string = packageJson.nhctl?.version;
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
    const pass: boolean = semver.satisfies(currentVersion, requiredVersion);
    if (!pass) {
      const result:
        | string
        | undefined = await vscode.window.showInformationMessage(
        `Nocalhost required nhctl(${requiredVersion}), current version is v${currentVersion}, please upgrade your nhctl to the specify version.`,
        "Get nhctl"
      );
      if (result === "Get nhctl") {
        vscode.env.openExternal(vscode.Uri.parse(NOCALHOST_INSTALLATION_LINK));
      }
    }
  }
}

function nhctlCommand(kubeconfigPath: string, baseCommand: string) {
  return `nhctl ${baseCommand} --kubeconfig ${kubeconfigPath}`;
}
