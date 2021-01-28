import { spawn } from "child_process";
import host, { Host } from "../host";
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
    const proc = spawn(command, args, { shell: true, env });
    let stdout = "";
    let stderr = "";
    proc.on("close", (code) => {
      resolve({ stdout, stderr, code });
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
  args: Array<any>
) {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const env = Object.assign(process.env, { DISABLE_SPINNER: true });
    const proc = spawn(command, args, { shell: true, env });
    let errorStr = "";
    proc.on("close", (code) => {
      if (code === 0) {
        resolve(null);
      } else {
        reject(errorStr);
      }
    });

    proc.stdout.on("data", function (data) {
      host.log("" + data);
    });

    proc.stderr.on("data", function (data) {
      errorStr = data + "";
      host.log("" + data);
    });
  });
}
