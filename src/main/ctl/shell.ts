import { spawn } from "child_process";
import host, { Host } from "../host";

function appendToNocalhostChannel(
  host: Host,
  code: number,
  stdout: string,
  stderr: string
) {
  if (code === 0) {
    host.log(stdout);
  } else {
    host.log(stderr);
  }
}

interface ShellResult {
  code: number;
  stdout: string;
  stderr: string;
}

export async function execAsync(
  command: string,
  args: Array<any>
): Promise<ShellResult> {
  // host.log(`[cmd] ${command}`, true);
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { shell: true });
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
    const proc = spawn(command, args, { shell: true });
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
