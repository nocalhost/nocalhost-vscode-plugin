import * as vscode from "vscode";
import { execAsync, execChildProcessAsync } from "./shell";
import { Host } from "../host";
import * as fileStore from "../store/fileStore";
import { CURRENT_KUBECONFIG_FULLPATH } from "../constants";
import { spawn } from "child_process";

export function install(
  host: Host,
  appName: string,
  gitUrl: string,
  installType: string,
  resourceDir: string,
  values?: string
) {
  const installCommand = nhctlCommand(
    `install ${appName} -u ${gitUrl} -t ${installType} ${
      values ? "-f " + values : ""
    } --resource-path ${resourceDir}`
  );

  host.log(`[cmd] ${installCommand}`, true);

  return new Promise((resolve, reject) => {
    const proc = spawn(installCommand, [], { shell: true });
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
      errorStr = data + "";
      host.log("" + data, true);
    });
  });
}

export async function uninstall(host: Host, appName: string) {
  const uninstallCommand = nhctlCommand(`uninstall ${appName} --force`);
  host.log(`[cmd] ${uninstallCommand}`, true);
  await execChildProcessAsync(host, uninstallCommand, []);
}

export async function devStart(
  host: Host,
  appName: string,
  workLoadName: string,
  syncs?: Array<string>
) {
  let syncOptions = "";
  if (syncs && syncs.length > 0) {
    syncOptions = syncs.join(" -s ");
    syncOptions = "-s " + syncOptions;
  }
  const devStartCommand = nhctlCommand(
    `dev start ${appName} -d ${workLoadName} ${syncOptions}`
  );
  host.log(`[cmd] ${devStartCommand}`, true);
  await execChildProcessAsync(host, devStartCommand, []);
}

export async function startPortForward(
  host: Host,
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
    `port-forward ${appName} -d ${workloadName} ${portOptions}`
  );

  host.log(`[cmd] ${portForwardCommand}`, true);

  await execChildProcessAsync(host, portForwardCommand, []);
}

export async function syncFile(
  host: Host,
  appName: string,
  workloadName: string
) {
  const syncFileCommand = nhctlCommand(`sync ${appName} -d ${workloadName}`);
  host.log(`[cmd] ${syncFileCommand}`, true);
  await execChildProcessAsync(host, syncFileCommand, []);
}

export async function endDevMode(
  host: Host,
  appName: string,
  workLoadName: string,
  namespace?: string
) {
  const end = nhctlCommand(`dev end ${appName} -d ${workLoadName} `);
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

function nhctlCommand(baseCommand: string) {
  const kubeconfig = fileStore.get(CURRENT_KUBECONFIG_FULLPATH);
  return `nhctl ${baseCommand} --kubeconfig ${kubeconfig}`;
}
