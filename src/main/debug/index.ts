import * as assert from "assert";
import * as vscode from "vscode";
import * as AsyncRetry from "async-retry";
import * as getPort from "get-port";

import SyncServiceCommand, {
  SyncMsg,
} from "../commands/sync/SyncServiceCommand";
import {
  associate,
  getServiceConfig,
  getSyncStatus,
  NhctlCommand,
} from "../ctl/nhctl";
import host from "../host";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import ConfigService, {
  ContainerConfig,
  NocalhostServiceConfig,
} from "../service/configService";
import logger from "../utils/logger";
import { exec } from "../ctl/shell";
import messageBus from "../utils/messageBus";
import { TMP_COMMAND } from "../constants";

export async function closeTerminals() {
  let condition = (t: vscode.Terminal) => t.name.endsWith(`Process Console`);

  const terminals = vscode.window.terminals.filter(condition);
  if (terminals.length === 0) {
    return;
  }

  terminals.forEach((i) => i.dispose());

  await AsyncRetry(
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

export async function waitForSync(node: ControllerResourceNode, name: string) {
  const checkReady = async () => {
    const profile = await getServiceConfig(
      node.getKubeConfigPath(),
      node.getNameSpace(),
      node.getAppName(),
      node.name,
      node.resourceType
    );

    assert(profile.associate, "You need to associate the local directory");

    if (profile.associate !== host.getCurrentRootPath()) {
      const uri = vscode.Uri.file(profile.associate);
      vscode.commands.executeCommand("vscode.openFolder", uri, true);

      const data = {
        name,
        parameter: {
          kubeconfig: node.getKubeConfigPath(),
          nameSpace: node.getNameSpace(),
          associate: profile.associate,
          app: node.getAppName(),
          service: node.name,
          resourceType: node.resourceType,
          status: await node.getStatus(),
        },
      };

      messageBus.emit("command", {
        name,
        parameter: {
          kubeconfig: node.getKubeConfigPath(),
          nameSpace: node.getNameSpace(),
          associate: profile.associate,
          app: node.getAppName(),
          service: node.name,
          resourceType: node.resourceType,
          status: await node.getStatus(),
        },
      });

      host.setGlobalState(TMP_COMMAND, data);

      return Promise.reject();
    }

    SyncServiceCommand.checkSync();
  };

  const sync = async () => {
    const str = await getSyncStatus(
      node.resourceType,
      node.getKubeConfigPath(),
      node.getNameSpace(),
      node.getAppName(),
      node.name,
      ["--timeout 600", "--wait"]
    );

    logger.info("waitForSync", str);

    const syncMsg: SyncMsg = JSON.parse(str);

    assert.strictEqual(syncMsg.status, "idle", "wait for sync timeout");
  };

  await host.withProgress(
    { title: "Waiting for sync file ...", cancellable: true },
    async (_, token) => {
      await checkReady();

      await closeTerminals();

      token.onCancellationRequested(() => {
        host.showWarnMessage("Cancel waiting");
      });

      await AsyncRetry(
        async (bail) => {
          await sync();

          if (token.isCancellationRequested) {
            bail(new Error());
            return;
          }
        },
        {
          randomize: false,
          retries: 3,
        }
      );
    }
  );
}

export async function getContainer(node: ControllerResourceNode) {
  let serviceConfig = await ConfigService.getAppConfig<NocalhostServiceConfig>(
    node.getKubeConfigPath(),
    node.getNameSpace(),
    node.getAppName(),
    node.name,
    node.resourceType
  );

  const containers = (serviceConfig && serviceConfig.containers) || [];
  let container: ContainerConfig;

  if (containers.length > 1) {
    const name = await host.showQuickPick(containers.map((item) => item.name));

    if (!name) {
      return Promise.reject();
    }

    return containers.find((item) => item.name === name);
  } else if (containers.length === 1) {
    container = containers[0];
  }

  assert(container, `Missing container configuration.`);

  return container;
}
export type ReasonType = "failed" | "cancel";
export class DebugCancellationTokenSource extends vscode.CancellationTokenSource {
  constructor() {
    super();
  }
  reason: ReasonType;
  cancelByReason(reason: ReasonType): void {
    super.cancel();
    this.reason = reason;
  }
}

export async function portForward(
  node: ControllerResourceNode,
  container: ContainerConfig,
  command: "end" | "start",
  localPort?: number
) {
  const { remoteDebugPort } = container.dev.debug;
  const port = localPort ?? (await getPort());

  await exec({
    command: NhctlCommand.nhctlPath,
    args: [
      "port-forward",
      command,
      node.getAppName(),
      `-d ${node.name}`,
      `-t ${node.resourceType}`,
      `-p ${port}:${remoteDebugPort}`,
      `-n ${node.getNameSpace()}`,
      `--kubeconfig ${node.getKubeConfigPath()}`,
    ],
  }).promise;

  let dispose = () => {
    return Promise.resolve();
  };

  if (command === "start") {
    dispose = async () => {
      await portForward(node, container, "end", port);
    };
  }

  return {
    port,
    dispose,
  };
}
export function sshReverse(
  node: ControllerResourceNode,
  container: ContainerConfig
) {}
