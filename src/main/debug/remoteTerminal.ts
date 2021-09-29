import * as vscode from "vscode";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";

import host from "../host";
import { NhctlCommand } from "../ctl/nhctl";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";

export async function createRemoteTerminal(
  terminalOptions: {
    name: string;
    iconPath?: { id: string };
  },
  spawnOptions: {
    command: string;
    shell?: string;
    node: ControllerResourceNode;
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
        proc.stdin.write("exit");
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

  let isRead = false;
  const send = (text: string) => {
    text = text.replace(/\n/g, "\r\n");

    if (!isRead) {
      proc.stdin.write(spawnOptions.command + "\n");
      isRead = true;
    }

    writeEmitter.fire(text);
  };

  const create = () => {
    const { node, close, shell } = spawnOptions;

    proc = spawn(
      NhctlCommand.nhctlPath,
      [
        "dev",
        "terminal",
        node.getAppName(),
        `-d ${node.name}`,
        `-t ${node.resourceType}`,
        `-n ${node.getNameSpace()}`,
        `--kubeconfig ${node.getKubeConfigPath()}`,
        `-c nocalhost-dev`,
        `--shell ${shell}`,
      ],
      {
        shell: true,
      }
    );

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

  terminal = host.createTerminal({
    ...terminalOptions,
    pty,
  });

  return terminal;
}
