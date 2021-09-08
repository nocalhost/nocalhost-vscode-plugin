import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import * as path from "path";
import * as shell from "shelljs";
import { Event } from "vscode";
import kill = require("tree-kill");

import host from "../host";
import { NH_BIN } from "../constants";
import logger from "../utils/logger";
import { ExecOutputReturnValue } from "shelljs";

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

interface ExecParam {
  command: string;
  args?: any[];
  timeout?: number;
  async?: boolean;
}

function showGlobalError(str: string) {
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

export function exec(
  param: ExecParam
): {
  cancel: Event<any>;
  promise: Promise<ExecOutputReturnValue>;
} {
  const { command, args, timeout, async } = param;

  logger.info(`[cmd] ${command}`);

  const env = Object.assign(process.env, { DISABLE_SPINNER: true });
  const proc = spawn(command, args, { shell: true, env });

  const startTime = Date.now();
  let stderr = "";
  let stdout = "";

  startTimeout({ timeout, proc, command });

  proc.stdout.on("data", function (data) {
    let str = "" + data;
    stdout += data;

    !async && host.log(str);
  });

  proc.stderr.on("data", function (data) {
    const str = data + "";
    stderr += str;

    !async && host.log(str);
    !async && showGlobalError(str);
  });

  proc.on("exit", () => {
    longTime(startTime, command);
  });

  const promise = new Promise<ExecOutputReturnValue>(async (res, rej) => {
    proc.on("close", (code, signal) => {
      if (code === 0) {
        res({ code, stdout, stderr });
      } else {
        logger.log(
          `[cmd] ${command} code: ${code} stdout: ${stdout} error:${stderr}`
        );

        if ("SIGTERM" === signal) {
          rej(new Error(`${command} ${stderr}`));
          return;
        }

        rej({ code, stdout, stderr });
      }
    });
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
        const { promise, cancel } = exec(rest);

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
