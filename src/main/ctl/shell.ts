import { spawn } from "child_process";
import * as path from "path";
import * as shell from "shelljs";
import host, { Host } from "../host";
import { NH_BIN } from "../constants";
import logger from "../utils/logger";
export interface ShellResult {
  code: number;
  stdout: string;
  stderr: string;
}

export async function opendevSpaceExec(
  appName: string,
  workloadName: string,
  workloadType: string,
  container: string | null,
  kubeConfigPath: string,
  namespace: string,
  pod: string | null
) {
  const terminalCommands = ["dev", "terminal", appName];
  terminalCommands.push("-d", workloadName);
  terminalCommands.push("-t", workloadType);
  if (pod) {
    terminalCommands.push("--pod", pod);
  }
  if (container) {
    terminalCommands.push("--container", container);
  }
  terminalCommands.push("--kubeconfig", kubeConfigPath);
  terminalCommands.push("-n", namespace);
  const nhctlPath = path.resolve(
    NH_BIN,
    host.isWindow() ? "nhctl.exe" : "nhctl"
  );
  const terminalDisposed = host.invokeInNewTerminalSpecialShell(
    terminalCommands,
    nhctlPath,
    workloadName
  );
  terminalDisposed.show();

  host.log("", true);

  return terminalDisposed;
}

export async function execAsyncWithReturn(
  command: string,
  args: Array<any>,
  startTime?: number
): Promise<ShellResult> {
  // host.log(`[cmd] ${command}`, true);
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const env = Object.assign(process.env, { DISABLE_SPINNER: true });
    logger.info(`[cmd] ${command}`);
    const proc = spawn(command, args, { shell: true, env });
    let stdout = "";
    let stderr = "";
    let err = `execute command fail: ${command}`;
    proc.on("close", (code) => {
      if (code === 0) {
        if (startTime !== undefined) {
          const end = Date.now() - startTime;
          if (end > 1000) {
            logger.info("[Time-consuming]: ${end}");
          }
        }
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`${err}. ${stderr}`));
      }
    });

    proc.stdout.on("data", function (data) {
      stdout += data;
    });

    proc.stderr.on("data", function (data) {
      stderr += data;
    });
  });
}

export async function execChildProcessAsync(
  host: Host,
  command: string,
  args: Array<any>,
  errorTips?: {
    dialog?: string;
    output?: string;
  },
  notShow?: boolean
) {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const env = Object.assign(process.env, { DISABLE_SPINNER: true });
    logger.info(`[cmd] ${command}`);
    const proc = spawn(command, args, { shell: true, env });
    let errorStr = "";
    let err = `execute command fail: ${command}`;
    proc.on("close", (code) => {
      if (code === 0) {
        resolve(null);
      } else {
        logger.error(`end dev fail: ${code}`);
        if (errorTips && errorTips.output) {
          host.log(errorTips.output, true);
        }
        reject((errorTips && errorTips.dialog) || `${err}. ${errorStr}`);
      }
    });

    proc.stdout.on("data", function (data) {
      host.log("" + data);
    });

    proc.stderr.on("data", function (data) {
      errorStr += data + "";
      if (errorStr && !notShow) {
        host.showErrorMessage(errorStr);
      }
      host.log("" + data);
      logger.error(`[cmd] ${command} error: ${data}`);
    });
  });
}

export function which(name: string) {
  const result = shell.which(name);
  if (result && result.code === 0) {
    return true;
  }

  return false;
}
