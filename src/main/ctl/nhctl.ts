import * as vscode from "vscode";
import {
  execAsyncWithReturn,
  execChildProcessAsync,
  ShellResult,
} from "./shell";
import host, { Host } from "../host";
import { spawn } from "child_process";
import * as yaml from "yaml";
import { PortForwardData, SvcProfile } from "../nodes/types/nodeType";

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
      `install ${appName} --helm-chart-name ${appName} -t ${installType} ${
        values ? "-f " + values : ""
      } --helm-repo-url ${gitUrl} ${
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
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const env = Object.assign(process.env, { DISABLE_SPINNER: true });
        const proc = spawn(installCommand, [], { shell: true, env });
        let errorStr = "";
        proc.on("close", (code) => {
          if (code === 0) {
            resolve(null);
          } else {
            reject(errorStr);
          }
        });

        proc.stdout.on("data", function (data) {
          host.log("" + data, true);
        });

        proc.stderr.on("data", function (data) {
          errorStr += data + "";
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
  await host.showProgressing(
    `Uninstalling application: ${appName}`,
    async (progress) => {
      const uninstallCommand = nhctlCommand(
        kubeconfigPath,
        `uninstall ${appName} --force`
      );
      host.log(`[cmd] ${uninstallCommand}`, true);
      await execChildProcessAsync(host, uninstallCommand, []);
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
  const devStartCommand = nhctlCommand(
    kubeconfigPath,
    `dev start ${appName} -d ${workLoadName} ${options} ${
      devStartAppendCommand ? devStartAppendCommand : ""
    }`
  );
  host.log(`[cmd] ${devStartCommand}`, true);
  await execChildProcessAsync(host, devStartCommand, []);
}

export async function startPortForward(
  host: Host,
  kubeconfigPath: string,
  appName: string,
  workloadName: string,
  way: "manual" | "devPorts",
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
      pod ? `--pod ${pod}` : ""
    } --way ${way}`
  );

  host.log(`[cmd] ${portForwardCommand}`, true);

  await execChildProcessAsync(host, portForwardCommand, []);
}

export async function endPortForward(
  appName: string,
  workloadName: string,
  port: string
) {
  // nhctl port-forward end coding-agile -d nginx -p 5006:5005
  const endPortForwardCommand = `nhctl port-forward end ${appName} -d ${workloadName} -p ${port}`;

  host.log(`[cmd] ${endPortForwardCommand}`, true);

  await execChildProcessAsync(host, endPortForwardCommand, []);
}

export async function getCurrentServiceStatusInfo(
  appName: string,
  workloadName: string
) {
  const describeCommand = `nhctl describe ${appName} -d ${workloadName}`;

  const result = await execAsyncWithReturn(describeCommand, []);

  const portforwardData = yaml.parse(result.stdout) as SvcProfile &
    PortForwardData;

  return portforwardData;
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
  await execChildProcessAsync(host, syncFileCommand, []);
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
      await execChildProcessAsync(host, end, []);
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
  const describeCommand = `nhctl plugin get ${appName}`;
  const result = await execAsyncWithReturn(describeCommand, []);
  return result.stdout;
}

export async function getServiceConfig(appName: string, workloadName: string) {
  const describeCommand = `nhctl plugin get ${appName} -d ${workloadName}`;
  const result = await execAsyncWithReturn(describeCommand, []);
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
  const resetCommand = nhctlCommand(
    kubeConfigPath,
    `dev reset ${appName} -d ${workloadName}`
  );
  host.log(`[cmd] ${resetCommand}`, true);
  await execChildProcessAsync(host, resetCommand, []);
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
  await execChildProcessAsync(host, cleanCommand, []);
}

export async function getSyncStatus(appName: string, workloadName: string) {
  const syncCommand = `nhctl sync-status ${appName} -d ${workloadName}`;
  let result: ShellResult = {
    stdout: "",
    stderr: "",
    code: 0,
  };
  result = (await execAsyncWithReturn(
    syncCommand,
    []
  ).catch(() => {})) as ShellResult;

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

function nhctlCommand(kubeconfigPath: string, baseCommand: string) {
  return `nhctl ${baseCommand} --kubeconfig ${kubeconfigPath}`;
}
