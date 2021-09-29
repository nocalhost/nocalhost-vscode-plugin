import * as vscode from "vscode";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";

import host from "../host";
type SpawnClose = (code: number, signal: NodeJS.Signals) => void;
type RemoteTerminalType = {
  terminal: {
    name: string;
    iconPath?: { id: string };
  };
  spawn: {
    command: string;
    close?: SpawnClose;
  };
};
export class RemoteTerminal implements vscode.Terminal {
  private options: RemoteTerminalType;

  private writeEmitter: vscode.EventEmitter<string> | null = new vscode.EventEmitter<string>();
  private terminal: vscode.Terminal | null;
  private proc: ChildProcessWithoutNullStreams | null;

  private exitCallback: Function | null;

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
      open: () => this.createProc(),
      close: () => {
        if (!this.proc.killed) {
          this.proc?.stdin.write("\x03");
          this.proc?.kill();
        }
      },
      handleInput: (data: string) => {
        this.proc?.stdin.write(data);
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

      if (this.exitCallback) {
        this.exitCallback();
      }

      this.send("\n\n\x1b[1;31mterminal close\x1b[37m\r\n");
    });

    this.proc = proc;
  }

  private send(text: string) {
    text = text.replace(/\n/g, "\r\n");

    this.writeEmitter?.fire(text);
  }

  sendText(text: string, addNewLine?: boolean): void {
    if (this.terminal) {
      this.terminal?.sendText(text, addNewLine);
    }
  }
  show(preserveFocus?: boolean): void {
    this.terminal.show(preserveFocus);
  }
  hide(): void {
    this.terminal.hide();
  }
  async sendCtrlC() {
    if (this.proc.exitCode !== null) {
      return Promise.resolve();
    }

    this.sendText("\x03");

    await new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error("close terminal timeout"));
      }, 10_000);

      this.exitCallback = resolve;
    }).finally(() => {
      this.exitCallback = null;
    });
  }
  async restart() {
    await this.sendCtrlC();
    this.createProc();

    return true;
  }
  dispose(): void {
    if (this.proc && this.proc.exitCode !== null) {
      this.proc.kill();
      this.proc = null;
    }

    this.writeEmitter?.dispose();
    this.writeEmitter = null;

    this.terminal?.dispose();
    this.terminal = null;
  }
}
