import * as assert from "assert";
import * as vscode from "vscode";
import { spawnSync } from "child_process";
import { ExecOutputReturnValue } from "shelljs";
const retry = require("async-retry");

import { SyncMsg } from "../commands/SyncServiceCommand";
import { getSyncStatus, NhctlCommand } from "../ctl/nhctl";
import { exec } from "../ctl/shell";
import host from "../host";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import { ContainerConfig } from "../service/configService";

export async function checkRequiredCommand(
  podName: string,
  namespace: string,
  kubeconfigPath: string
) {
  function check(requiredCommand: string) {
    const command = `k exec ${podName} -c nocalhost-dev --kubeconfig ${kubeconfigPath} -n ${namespace}  --`;
    const args = command.split(" ");

    args.push(`which ${requiredCommand}`);

    const result = spawnSync(NhctlCommand.nhctlPath, args);

    return result.stdout;
  }

  const notFound: Array<string> = [];
  ["ps", "awk"].forEach((c) => {
    const r = check(c);
    if (!r) {
      notFound.push(c);
    }
  });

  assert.strictEqual(
    notFound.length,
    0,
    "Not found command in container: " + notFound.join(" ")
  );
}
async function closeOld(node: ControllerResourceNode) {
  let condition = (t: vscode.Terminal) =>
    t.name.endsWith(`${node.getAppName()}-${node.name}`);

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
export async function killContainerCommandProcess(
  container: ContainerConfig,
  node: ControllerResourceNode,
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

  const command = await NhctlCommand.exec({
    namespace: node.getNameSpace(),
    kubeConfigPath: node.getKubeConfigPath(),
  });

  const { code, stdout } = (await exec({
    command: command.getCommand(),
    args: [
      podName,
      `-c nocalhost-dev`,
      `-- bash -c "ps aux| ${grepStr}|grep -v grep|awk '{print \\$2}'"`,
    ],
  }).promise.catch((err) => err)) as ExecOutputReturnValue;

  assert.strictEqual(0, code, "find command error");

  if (stdout) {
    const { code } = (await exec({
      command: command.getCommand(),
      args: [
        podName,
        `-c nocalhost-dev`,
        `-- bash -c "kill -9 ${stdout.split("\n").join(" ")}"`,
      ],
    }).promise.catch((err) => err)) as ExecOutputReturnValue;

    assert.strictEqual(0, code, "kill command error");
  }

  await closeOld(node);

  return Promise.resolve();
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
