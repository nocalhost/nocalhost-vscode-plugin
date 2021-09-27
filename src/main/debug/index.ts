import * as assert from "assert";
import * as vscode from "vscode";
import { uniq } from "lodash";
import { ExecOutputReturnValue } from "shelljs";
const isWindows = require("is-windows");
const retry = require("async-retry");

import { SyncMsg } from "../commands/SyncServiceCommand";
import { getSyncStatus, NhctlCommand } from "../ctl/nhctl";
import { exec } from "../ctl/shell";
import host from "../host";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import { ContainerConfig } from "../service/configService";

function getBackslash() {
  if (isWindows()) {
    return "";
  }
  return "\\";
}

export async function checkRequiredCommand(
  podName: string,
  namespace: string,
  kubeConfigPath: string
) {
  const command = await NhctlCommand.exec({
    namespace,
    kubeConfigPath,
  });

  const requiredCommand = ["ps", "pkill", "awk", "lsof", "nc"];

  return Promise.allSettled(
    requiredCommand.map(
      (cmd) =>
        exec({
          command: command.getCommand(),
          args: [podName, `-c nocalhost-dev`, `-- bash -c "which ${cmd}"`],
          output: false,
        }).promise
    )
  ).then((results) => {
    const notFond = results
      .map((item, index) => {
        return {
          command: requiredCommand[index],
          status: item.status === "rejected",
        };
      })
      .filter((item) => item.status)
      .map((item) => item.command);

    assert.strictEqual(
      notFond.length,
      0,
      `The container depends on ${notFond.join(",")} check`
    );
  });
}
async function closeTerminals() {
  let condition = (t: vscode.Terminal) => t.name.endsWith(`Process Console`);

  const terminals = vscode.window.terminals.filter(condition);
  if (terminals.length === 0) {
    return;
  }

  terminals.forEach((i) => i.dispose());

  await retry(
    () => {
      const terminal = vscode.window.terminals.find(condition);
      assert(!terminal, "close old terminal error");
    },
    {
      randomize: false,
      retries: 3,
    }
  );
}

async function killCommandProcess(
  container: ContainerConfig,
  command: NhctlCommand,
  podName: string
) {
  const runCommand = (container.dev.command?.run ?? []).join(" ");
  const debugCommand = (container.dev.command?.debug ?? []).join(" ");
  const grepPattern: Array<string> = [];
  if (runCommand) {
    grepPattern.push(`-e '${runCommand}'`);
  }
  if (debugCommand) {
    grepPattern.push(`-e '${debugCommand}'`);
  }

  const grepStr = "grep " + grepPattern.join(" ");

  const { code, stdout } = (await exec({
    command: command.getCommand(),
    args: [
      podName,
      `-c nocalhost-dev`,
      `-- bash -c "ps aux| ${grepStr}|grep -v grep|awk '{print ${getBackslash()}$2}'"`,
    ],
  }).promise.catch((err) => err)) as ExecOutputReturnValue;

  assert.strictEqual(0, code, "kill command error");

  if (stdout) {
    const { code } = (await exec({
      command: command.getCommand(),
      args: [
        podName,
        `-c nocalhost-dev`,
        `-- bash -c "pkill -s ${stdout.split("\n").join(" ")}"`,
      ],
    }).promise.catch((err) => err)) as ExecOutputReturnValue;

    assert.strictEqual(0, code, "kill command error");
  }
}

async function killPortProcess(
  container: ContainerConfig,
  command: NhctlCommand,
  podName: string
) {
  const { remoteDebugPort } = container.dev.debug;

  const { code, stdout } = (await exec({
    command: command.getCommand(),
    args: [
      podName,
      `-c nocalhost-dev`,
      `-- bash -c "lsof -i:${remoteDebugPort}|awk 'NR == 1 {next} {print ${getBackslash()}$2}'"`,
    ],
  }).promise.catch((err) => err)) as ExecOutputReturnValue;

  assert.strictEqual(0, code, "find port error");

  if (stdout) {
    const { code } = (await exec({
      command: command.getCommand(),
      args: [
        podName,
        `-c nocalhost-dev`,
        `-- bash -c "kill -9 ${uniq(stdout.split("\n")).join(" ")}"`,
      ],
    }).promise.catch((err) => err)) as ExecOutputReturnValue;

    assert.strictEqual(0, code, "kill port error");
  }
}
export async function waitForRemoteDebugPortReady(
  container: ContainerConfig,
  node: ControllerResourceNode,
  podName: string
) {
  const { remoteDebugPort } = container.dev.debug;

  const command = NhctlCommand.exec({
    namespace: node.getNameSpace(),
    kubeConfigPath: node.getKubeConfigPath(),
  }).getCommand();

  const { code } = (await exec({
    command,
    args: [
      podName,
      `-c nocalhost-dev`,
      `-- bash -c "nc -vz 127.0.0.1 ${remoteDebugPort}"`,
    ],
    output: false,
  }).promise.catch((err) => err)) as ExecOutputReturnValue;

  assert.strictEqual(
    0,
    code,
    "The attempt to connect to the remote debug port timed out."
  );
}

export async function killContainerProcess(
  container: ContainerConfig,
  node: ControllerResourceNode,
  podName: string
) {
  await closeTerminals();

  const command = NhctlCommand.exec({
    namespace: node.getNameSpace(),
    kubeConfigPath: node.getKubeConfigPath(),
  });

  await killCommandProcess(container, command, podName);
  await killPortProcess(container, command, podName);
}

export async function waitForSync(node: ControllerResourceNode) {
  const str = await getSyncStatus(
    node.resourceType,
    node.getKubeConfigPath(),
    node.getNameSpace(),
    node.getAppName(),
    node.name,
    ["--timeout 600", "--wait"]
  );

  const syncMsg: SyncMsg = JSON.parse(str);

  assert.strictEqual(syncMsg.status, "idle", "wait for sync timeout");
}

export async function getContainer(node: ControllerResourceNode) {
  let container: ContainerConfig | undefined;

  const serviceConfig = node.nocalhostService;
  const containers = (serviceConfig && serviceConfig.containers) || [];

  if (containers.length > 1) {
    const containerNames = containers.map((c) => c.name);
    const containerName = await host.showQuickPick(containerNames);

    if (!containerName) {
      return;
    }

    container = containers.filter((c) => {
      return c.name === containerName;
    })[0];
  } else if (containers.length === 1) {
    container = containers[0];
  } else {
    host.showInformationMessage("Missing container confiuration");
    return;
  }

  return container;
}