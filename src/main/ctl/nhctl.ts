import * as vscode from "vscode";
import { execAsync, execChildProcessAsync } from "./shell";
import { Host } from "../host";
import * as fileStore from "../store/fileStore";
import { CURRENT_KUBECONFIG_FULLPATH } from "../constants";
import { spawn } from "child_process";
import * as readline from "readline";

export function install(host: Host, appName: string, gitUrl: string) {
  const installCommand = nhctlCommand(`install ${appName} -u ${gitUrl}`);

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
  const uninstallCommand = nhctlCommand(`uninstall ${appName}`);
  host.log(`[cmd] ${uninstallCommand}`, true);
  await execChildProcessAsync(host, uninstallCommand, []);
}

export async function replaceImage(
  host: Host,
  appName: string,
  workLoadName: string
) {
  const replaceImageCommand = nhctlCommand(
    `dev start ${appName} -d ${workLoadName}`
  );
  host.log(`[cmd] ${replaceImageCommand}`, true);
  await execAsync(replaceImageCommand, []);
}

export function startPortForward(
  host: Host,
  appName: string,
  workloadName: string
) {
  const portForwardCommand = nhctlCommand(
    `port-forward ${appName} -d ${workloadName} `
  );

  host.log(`[cmd] ${portForwardCommand}`, true);

  return new Promise((resolve: (value: any) => void, reject) => {
    const proc = spawn(portForwardCommand, [], {
      shell: true,
    });

    const rl = readline.createInterface({
      input: proc.stdout,
      output: proc.stdin,
    });

    const _timeoutId = setTimeout(() => {
      proc.kill();
      vscode.window.showErrorMessage("port forward error. please check to log");
      reject("forward timeout");
    }, 1000 * 5);

    rl.on("line", (line) => {
      host.log(line, true);
      if (line.indexOf("Forwarding from") >= 0) {
        clearTimeout(_timeoutId);
        resolve({ dispose: () => proc.kill() });
      }
    });
  });
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

export async function exitDevSpace(
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
  const describeCommand = nhctlCommand(`describe ${appName}`);
  host.log(`[cmd] ${describeCommand}`, true);
  const result = await execAsync(describeCommand, []);
  return result.stdout;
}

function nhctlCommand(baseCommand: string) {
  const kubeconfig = fileStore.get(CURRENT_KUBECONFIG_FULLPATH);

  return `nhctl ${baseCommand} --kubeconfig ${kubeconfig}`;
}
