import { ChildProcessWithoutNullStreams, spawn, execSync } from "child_process";
import * as path from "path";
import * as iconv from "iconv-lite";
import { Event } from "vscode";
import kill = require("tree-kill");
import * as shellWhich from "which";

import host from "../host";
import logger from "../utils/logger";

export interface ExecOutputReturnValue {
  /** The process exit code. */
  code: number;

  /** The process standard output. */
  stdout: string;

  /** The process standard error output. */
  stderr: string;
}

function showGlobalMsg(str: string) {
  const strArr = str.split("\n");

  const findStr = (keyWords: string) => {
    return (str: string) => str.startsWith(keyWords);
  };

  const warnStr = strArr.find(findStr("[WARNING]"));
  if (warnStr) {
    return host.showInformationMessage(warnStr, {
      modal: true,
    });
  }
  const infoStr = strArr.find(findStr("[INFO]"));
  if (infoStr) {
    return host.showWarnMessage(infoStr);
  }
  const errStr = strArr.find(findStr("[ERROR]"));
  if (errStr) {
    host.showErrorMessage(errStr);
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
  ignoreError?: boolean;
  printCommand?: boolean;
  sudo?: boolean;
  enterPassword?: boolean;
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
let encoding: "gbk" | "utf8";

function decodeBuffer(buffer: Buffer) {
  try {
    if (
      !encoding &&
      host.isWindow() &&
      !process.env.ComSpec.endsWith("Git\\bin\\bash.exe")
    ) {
      const stdout = execSync("chcp");

      if (stdout.toString().includes("936")) {
        encoding = "gbk";
      }
    }
  } catch (error) {
    logger.error("bufferToStr", error);

    encoding = "utf8";
  }

  if (encoding === "gbk") {
    return iconv.decode(buffer, encoding);
  }

  return buffer.toString();
}

export function createProcess(param: ExecParam) {
  let { command, args, output, sudo, enterPassword } = param;
  const env = Object.assign(process.env, { DISABLE_SPINNER: true });
  command = command + " " + (args || []).join(" ");
  command = getExecCommand(command);

  if (param.printCommand !== false) {
    logger.info(`[cmd] ${command}`);
  }

  if (sudo) {
    command = `sudo -p "Password:" -S ${command}`;
    enterPassword = true;
  }

  const proc = spawn(command, [], { shell: true, env });

  const { err, out } = getOutput(output);
  let stderr = "";
  let stdout = "";

  if (out) {
    host.log(`\n[cmd] ${command}`, true);
  }

  proc.stdout.on("data", function (data: Buffer) {
    const str = data.toString();
    stdout += str;

    out && host.log(str);
    showGlobalMsg(str);
  });

  proc.stderr.on("data", async function (data: Buffer) {
    const str = decodeBuffer(data);
    stderr += str;

    if (enterPassword && str.includes("Password:")) {
      let password = await host.showInputBox({
        password: true,
        placeHolder:
          "nhctl wants to make changes. Type your admin password to allow this.",
      });

      proc.stdin.write(`${password}\n`);
      return;
    }

    err && host.log(str);
  });

  const promise = new Promise<ExecOutputReturnValue>(async (res, rej) => {
    proc.on("close", (code, signal) => {
      if (code === 0) {
        res({ code, stdout, stderr });
      } else {
        if ("SIGTERM" === signal || param.ignoreError) {
          rej();
          return;
        }

        const error = new ShellExecError({ code, stdout, stderr, command });
        logger.error(error);

        if (param.ignoreError !== true && !err) {
          host.log(`\n[cmd] ${command} \rstderr:${stderr}`);
        }

        rej(error);
      }
    });
  });

  return { proc, promise };
}

export function exec(param: ExecParam): {
  cancel: Event<any>;
  promise: Promise<ExecOutputReturnValue>;
  proc: ChildProcessWithoutNullStreams;
} {
  const { command, timeout } = param;
  const startTime = Date.now();
  const { proc, promise } = createProcess(param);

  startTimeout({ timeout, proc, command });

  proc.on("exit", () => {
    longTime(startTime, command);
  });

  return {
    promise,
    proc,
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
  return !!shellWhich.sync(name, { nothrow: true });
}

export function getExecCommand(command: string) {
  if (host.isWindow() && process.env.ComSpec.endsWith("Git\\bin\\bash.exe")) {
    command = command.replaceAll(path.sep, "\\\\\\");
  }
  return command;
}
