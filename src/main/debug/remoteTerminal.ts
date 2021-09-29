import * as vscode from "vscode";
import * as assert from "assert";
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
    commands: string[];
    node: ControllerResourceNode;
    close?: (code: number, signal: string) => void;
  },
  ptyOptions?: {
    open: (write: vscode.EventEmitter<string>) => void;
    close?: Function;
  }
) {
  assert(
    spawnOptions.commands.length > 0,
    "spawnOptions commands is not empty"
  );

  let proc: ChildProcessWithoutNullStreams;
  let terminal: vscode.Terminal;

  const writeEmitter = new vscode.EventEmitter<string>();

  const open = () => {
    const { node, close } = spawnOptions;

    const args = [
      "exec",
      node.getAppName(),
      `-d ${node.name}`,
      `-t ${node.resourceType}`,
      `-n ${node.getNameSpace()}`,
      `--kubeconfig ${node.getKubeConfigPath()}`,
      `--container nocalhost-dev`,
    ];

    spawnOptions.commands.forEach((command) => args.push(`-c ${command}`));

    proc = spawn(NhctlCommand.nhctlPath, args, {
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

      if (ptyOptions?.close) {
        ptyOptions.close(writeEmitter);
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
    ...terminalOptions,
    pty,
  });

  return terminal;
}
