import * as vscode from "vscode";
import { execAsync, execChildProcessAsync } from "./shell";
import host, { Host } from "../host";
import { spawn } from "child_process";
import * as yaml from "yaml";

export function install(
  host: Host,
  kubeconfigPath: string,
  appName: string,
  appConfig: string,
  helmNHConfigPath: string,
  gitUrl: string,
  installType: string,
  resourceDir: Array<string>,
  values?: string,
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
    } ${resourcePath} ${appConfig ? "--config " + appConfig : ""}`
  );

  if (installType === "helmRepo") {
    installCommand = nhctlCommand(
      kubeconfigPath,
      `install ${appName} --helm-chart-name ${appName} -t ${installType} --helm-repo-url ${gitUrl} ${
        helmNHConfigPath ? "--outer-config " + helmNHConfigPath : ""
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
    () =>
      new Promise((resolve, reject) => {
        const proc = spawn(installCommand, [], { shell: true });
        let errorStr = "";
        proc.on("close", (code) => {
          if (code === 0) {
            host.showInformationMessage(`Application ${appName} installed`);
            resolve(null);
          } else {
            reject(errorStr);
          }
        });

        proc.stdout.on("data", function (data) {
          host.log("" + data, true);
        });

        proc.stderr.on("data", function (data) {
          errorStr = data + "";
          host.log("" + data, true);
        });
      })
  );
}

export async function uninstall(
  host: Host,
  kubeconfigPath: string,
  appName: string
) {
  const uninstallCommand = nhctlCommand(
    kubeconfigPath,
    `uninstall ${appName} --force`
  );
  host.log(`[cmd] ${uninstallCommand}`, true);
  await execChildProcessAsync(host, uninstallCommand, []);
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
  storageClass?: string
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
  const devStartCommand = nhctlCommand(
    kubeconfigPath,
    `dev start ${appName} -d ${workLoadName} ${options}`
  );
  host.log(`[cmd] ${devStartCommand}`, true);
  await execChildProcessAsync(host, devStartCommand, []);
}

export async function startPortForward(
  host: Host,
  kubeconfigPath: string,
  appName: string,
  workloadName: string,
  ports?: Array<string>
) {
  let portOptions = "";
  if (ports && ports.length > 0) {
    portOptions = ports.join(" -p ");
    portOptions = "-p " + portOptions;
  }
  const portForwardCommand = nhctlCommand(
    kubeconfigPath,
    `port-forward ${appName} -d ${workloadName} ${portOptions}`
  );

  host.log(`[cmd] ${portForwardCommand}`, true);

  await execChildProcessAsync(host, portForwardCommand, []);
}

export async function syncFile(
  host: Host,
  kubeconfigPath: string,
  appName: string,
  workloadName: string,
  syncedPatterns: Array<string> | undefined,
  ignoredPatterns: Array<string> | undefined,
  isOld: boolean
) {
  let baseCommand = `sync ${appName} -d ${workloadName}`;
  if (!isOld) {
    if (syncedPatterns && syncedPatterns.length > 0) {
      syncedPatterns.map((p) => {
        baseCommand += ` -s ${p}`;
      });
    }
    if (ignoredPatterns && ignoredPatterns.length > 0) {
      ignoredPatterns.map((p) => {
        baseCommand += ` -i ${p}`;
      });
    }
  }
  const syncFileCommand = nhctlCommand(kubeconfigPath, baseCommand);

  host.log(`[cmd] ${syncFileCommand}`, true);
  await execChildProcessAsync(host, syncFileCommand, []);
}

export async function endDevMode(
  host: Host,
  kubeconfigPath: string,
  appName: string,
  workLoadName: string
) {
  const end = nhctlCommand(
    kubeconfigPath,
    `dev end ${appName} -d ${workLoadName} `
  );
  host.log(`[cmd] ${end}`, true);
  host.disposeDebug();
  await execChildProcessAsync(host, end, []);
}

export async function loadResource(host: Host, appName: string) {
  const describeCommand = `nhctl describe ${appName}`;
  // host.log(`[cmd] ${describeCommand}`, true);
  const result = await execAsync(describeCommand, []);
  return result.stdout;
}

export async function getAppInfo(appName: string) {
  const describeCommand = `nhctl plugin get ${appName}`;
  const result = await execAsync(describeCommand, []);
  return result.stdout;
}

export async function getServiceConfig(appName: string, workloadName: string) {
  const describeCommand = `nhctl plugin get ${appName} -d ${workloadName}`;
  const result = await execAsync(describeCommand, []);
  return result.stdout;
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
  const result = await execAsync(configCommand, []);
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
  const result = await execAsync(configCommand, []);
  return result.stdout;
}

export async function resetService(
  kubeConfigPath: string,
  appName: string,
  workloadName: string
) {
  const resetCommand = nhctlCommand(
    kubeConfigPath,
    `dev reset ${appName} -d ${workloadName}`
  );
  host.log(`[cmd] ${resetCommand}`, true);
  await execChildProcessAsync(host, resetCommand, []);
}

export async function getTemplateConfig(appName: string, workloadName: string) {
  const configCommand = `nhctl config template ${appName} -d ${workloadName}`;
  const result = await execAsync(configCommand, []);
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
  const result = await execAsync(configCommand, []);
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
  await execAsync(cleanCommand, []);
}

function nhctlCommand(kubeconfigPath: string, baseCommand: string) {
  return `nhctl ${baseCommand} --kubeconfig ${kubeconfigPath}`;
}
