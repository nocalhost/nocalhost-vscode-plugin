import * as vscode from "vscode";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";

import host from "../host";

type RemoteTerminalType = {
  terminal: {
    name: string;
    iconPath?: { id: string };
  };
  spawn: {
    command: string;
    close?: (code: number, signal: string) => void;
  };
  pty?: {
    open: (write: vscode.EventEmitter<string>) => void;
    close?: Function;
  };
};
export class RemoteTerminal implements vscode.Terminal {
  private options: RemoteTerminalType;

  private writeEmitter = new vscode.EventEmitter<string>();
  private terminal: vscode.Terminal;
  private proc: ChildProcessWithoutNullStreams;

  constructor(options: RemoteTerminalType) {
    this.options = options;

    this.createTerminal();

    return this;
  }
  static create(options: RemoteTerminalType) {
    return new RemoteTerminal(options);
  }
  get name() {
    return this.terminal.name;
  }
  get processId() {
    return this.terminal.processId;
  }
  get creationOptions() {
    return this.terminal.creationOptions;
  }
  get exitStatus() {
    return this.terminal.exitStatus;
  }
  private createTerminal() {
    const pty: vscode.Pseudoterminal = {
      onDidWrite: this.writeEmitter.event,
      open: this.createProc.bind(this),
      close: () => {
        if (!this.proc.killed) {
          this.proc.stdin.write("\x03");
          this.proc.kill();
        }

        if (this.options.pty?.close) {
          this.options.pty?.close(this.writeEmitter);
        }
      },
      handleInput: (data: string) => {
        this.proc.stdin.write(data);
      },
    };

    this.terminal = host.createTerminal({
      ...this.options.terminal,
      pty,
    });
  }
  private createProc() {
    const { close, command } = this.options.spawn;

    const proc = spawn(command, [], {
      shell: true,
    });

    proc.stdout.on("data", (data: Buffer) => {
      const str = data.toString();

      this.send(str);
    });

    proc.stderr.on("data", (data: Buffer) => {
      const str = data.toString();

      this.send(str);
    });
    proc.on("close", (code, signal) => {
      close && close(code, signal);

      this.writeEmitter.fire("\n\n\x1b[1;31mterminal close\x1b[37m\r\n");
      this.writeEmitter.dispose();
    });

    this.proc = proc;
  }

  private send(text: string) {
    text = text.replace(/\n/g, "\r\n");

    this.writeEmitter.fire(text);
  }

  sendText(text: string, addNewLine?: boolean): void {
    this.terminal.sendText(text, addNewLine);
  }
  show(preserveFocus?: boolean): void {
    this.terminal.show(preserveFocus);
  }
  hide(): void {
    this.terminal.hide();
  }
  dispose(): void {
    if (!this.proc.killed) {
      this.proc.kill();
    }

    this.writeEmitter.dispose();
    this.terminal.dispose();
  }
}

export async function createRemoteTerminal(options: RemoteTerminalType) {
  let proc: ChildProcessWithoutNullStreams;
  let terminal: vscode.Terminal;

  const writeEmitter = new vscode.EventEmitter<string>();

  const open = () => {
    const { close, command } = options.spawn;

    proc = spawn(command, [], {
      shell: true,
    });

    proc.stdout.on("data", (data: Buffer) => {
      const str = data.toString();

      send(str);
    });

    proc.stderr.on("data", function (data: Buffer) {
      const str = data.toString();

      send(str);
    });
    proc.on("close", (code, signal) => {
      close && close(code, signal);

      writeEmitter.fire("\n\n\x1b[1;31mterminal close\x1b[37m\r\n");
    });
  };

  const pty: vscode.Pseudoterminal = {
    onDidWrite: writeEmitter.event,
    open,
    close() {
      if (!proc.killed) {
        proc.stdin.write("\x03");
        proc.kill();
      }

      if (options.pty?.close) {
        options.pty.close(writeEmitter);
      }
    },
    handleInput(data: string) {
      proc.stdin.write(data);
    },
  };

  const send = (text: string) => {
    text = text.replace(/\n/g, "\r\n");

    writeEmitter.fire(text);
  };

  terminal = host.createTerminal({
    ...options.terminal,
    pty,
  });

  return terminal;
}
