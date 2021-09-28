import * as vscode from "vscode";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";

import host from "../host";
import { NhctlCommand } from "../ctl/nhctl";

function sendText(text: string) {
  text = text.replace(/\n/g, "\r\n");

  return text;
}

export async function createRemoteTerminal(
  terminalOptions: {
    name: string;
    iconPath?: { id: string };
  },
  spawnOptions: {
    command: string;
    args: ReadonlyArray<string>;
    close?: (code: number, signal: string) => void;
  },
  ptyOptions?: {
    open: (Emitter: vscode.EventEmitter<string>) => void;
    close?: Function;
  }
) {
  let proc: ChildProcessWithoutNullStreams;
  let terminal: vscode.Terminal;

  const writeEmitter = new vscode.EventEmitter<string>();

  const pty: vscode.Pseudoterminal = {
    onDidWrite: writeEmitter.event,
    open() {
      create();

      if (ptyOptions?.open) {
        ptyOptions.open(writeEmitter);
      }
    },
    close() {
      if (!proc.killed) {
        proc.stdin.write("\x03");
        proc.kill();
      }

      if (ptyOptions?.close) {
        ptyOptions.close(writeEmitter);
      }
    },
    handleInput(data: string) {
      proc.stdin.write(data);
    },
  };
  const create = () => {
    const { args, command, close } = spawnOptions;

    proc = spawn(NhctlCommand.nhctlPath, args, { shell: true });
    setTimeout(() => {
      proc.stdin.write(command + "\n");
    }, 250);

    proc.stdout.on("data", (data: Buffer) => {
      const str = data.toString();

      writeEmitter.fire(sendText(str));
    });

    proc.stderr.on("data", function (data: Buffer) {
      const str = data.toString();

      writeEmitter.fire(sendText(str));
    });
    proc.on("close", (code, signal) => {
      close && close(code, signal);

      writeEmitter.fire("\n\n\x1b[1;31mterminal close\x1b[37m\r\n");
    });
  };

  terminal = host.createTerminal({
    ...terminalOptions,
    pty,
  });

  return terminal;
}
