import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import * as path from "path";
import * as shell from "shelljs";
import { Event } from "vscode";
import { ExecOutputReturnValue } from "shelljs";
import kill = require("tree-kill");

import host from "../host";
import { NH_BIN } from "../constants";
import logger from "../utils/logger";

export async function openDevSpaceExec(
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

function showGlobalMsg(str: string) {
  if (str.indexOf("[WARNING]") > -1) {
    host.showInformationMessage(str, {
      modal: true,
    });
  }
  if (str.indexOf("[INFO]") > -1) {
    host.showWarnMessage(str);
  }
  if (str.indexOf("ERROR") > -1) {
    host.showErrorMessage(str);
  }
}

function longTime(startTime: number, command: string) {
  const end = Date.now() - startTime;
  if (end > 1000) {
    logger.info(`[Time-consuming]: ${command} ${end}`);
  }
}

function startTimeout(param: {
  timeout?: number;
  proc: ChildProcessWithoutNullStreams;
  command: string;
}) {
  const { timeout, proc, command } = param;

  if (!timeout) {
    return;
  }

  let timeoutId = setTimeout(() => {
    if (timeoutId && !proc.killed) {
      kill(proc.pid, "SIGTERM", (err) => {
        if (err) {
          const str = `[cmd kill] ${command} Error:`;

          logger.error(str, err);
          host.log(str + err, true);
        }
      });

      const log = `[cmd] ${command} timeout:${timeout}`;

      logger.log(log);
      host.log(log, true);
    }
  }, timeout);

  proc.once("exit", () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  });
}

export interface ExecParam {
  command: string;
  args?: any[];
  timeout?: number;
  output?: OutPut;
}

type OutPut = boolean | { err: boolean; out: boolean };

function getOutput(output: OutPut = false) {
  if (typeof output === "boolean") {
    return {
      err: output,
      out: output,
    };
  }
  return output;
}

export class ShellExecError extends Error {
  stdout?: string;
  stderr?: string;
  code?: number;

  constructor(result: ExecOutputReturnValue & Pick<ExecParam, "command">) {
    const { command, stdout, stderr, code } = result;

    super(`execute command fail:${command}`);

    this.stderr = stderr;
    this.stdout = stdout;
    this.code = code;
  }
}

export function createProcess(param: ExecParam) {
  const { command, args, output } = param;
  const env = Object.assign(process.env, { DISABLE_SPINNER: true });

  const proc = spawn(command, args, { shell: true, env });

  const { err, out } = getOutput(output);
  let stderr = "";
  let stdout = "";

  if (out) {
    host.log(`\n[cmd] ${command}`, true);
  }

  proc.stdout.on("data", function (data: Buffer) {
    let str = data.toString();
    stdout += data;

    out && host.log(str);
    showGlobalMsg(str);
  });

  proc.stderr.on("data", function (data: Buffer) {
    const str = data.toString();
    stderr += str;

    err && host.log(str);
  });

  const promise = new Promise<ExecOutputReturnValue>(async (res, rej) => {
    proc.on("close", (code, signal) => {
      if (code === 0) {
        res({ code, stdout, stderr });
      } else {
        if ("SIGTERM" === signal) {
          rej();
          return;
        }

        const error = new ShellExecError({ code, stdout, stderr, command });
        logger.error(error);

        rej(error);
      }
    });
  });

  return { proc, promise };
}

export function exec(
  param: ExecParam
): {
  cancel: Event<any>;
  promise: Promise<ExecOutputReturnValue>;
} {
  const { command, timeout } = param;
  const startTime = Date.now();
  const { proc, promise } = createProcess(param);

  logger.info(`[cmd] ${command}`);

  startTimeout({ timeout, proc, command });

  proc.on("exit", () => {
    longTime(startTime, command);
  });

  return {
    promise,
    cancel() {
      if (!proc.killed) {
        kill(proc.pid, "SIGTERM", (err) => {
          const log = `\n[cmd cancel] ${command}`;

          host.log(log, true);
          logger.info(log);

          err && logger.info(`[cmd kill] ${command} Error:`, err);
        });
      }

      return { dispose() {} };
    },
  };
}

export function execWithProgress(
  param: ExecParam & { title: string }
): Promise<ExecOutputReturnValue> {
  const { title, ...rest } = param;

  return Promise.resolve(
    host.withProgress(
      {
        title,
        cancellable: true,
      },
      (_, token) => {
        const { promise, cancel } = exec({ output: true, ...rest });

        token.onCancellationRequested(cancel);

        return promise;
      }
    )
  );
}

export function which(name: string) {
  const result = shell.which(name);

  return result && result.code === 0;
}
