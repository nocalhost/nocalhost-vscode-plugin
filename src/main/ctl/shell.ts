import { spawn } from "child_process";
import host, { Host } from "../host";
import * as shell from "shelljs";
import logger from "../utils/logger";
export interface ShellResult {
  code: number;
  stdout: string;
  stderr: string;
}

export async function execAsyncWithReturn(
  command: string,
  args: Array<any>
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
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(stderr || err));
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
    proc.on("close", (code) => {
      if (code === 0) {
        resolve(null);
      } else {
        if (errorTips && errorTips.output) {
          host.log(errorTips.output, true);
        }
        reject(
          (errorTips && errorTips.dialog) || `execute command fail: ${command}`
        );
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
