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

const ANSI_COLOR_BLUE = "\x1b[34m";
const ANSI_COLOR_RED = "\x1b[31m";
const ANSI_COLOR_RESET = "\x1b[0m";

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
      close: async () => {
        if (this.proc) {
          await this.sendCtrlC();

          this.proc?.kill();
          this.proc = null;
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

      this.send(`\n\n${ANSI_COLOR_RED}terminal close${ANSI_COLOR_RESET}\r\n`);

      this.proc = null;
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
    if (this.proc === null) {
      return Promise.resolve();
    }

    await new Promise<void>((resolve) => {
      this.proc.stdin.write("\x03");

      this.exitCallback = resolve;
    });
  }
  async restart() {
    this.send("\x1b[H\x1b[2J");
    this.send(`\n${ANSI_COLOR_BLUE}restart${ANSI_COLOR_RESET}\r\n`);

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
  }
}
