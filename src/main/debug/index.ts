import * as assert from "assert";
import * as vscode from "vscode";
import * as AsyncRetry from "async-retry";

import { SyncMsg } from "../commands/SyncServiceCommand";
import { getSyncStatus } from "../ctl/nhctl";
import host from "../host";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import ConfigService, {
  ContainerConfig,
  NocalhostServiceConfig,
} from "../service/configService";
import logger from "../utils/logger";

export async function closeTerminals() {
  let condition = (t: vscode.Terminal) => t.name.endsWith(`Process Console`);

  const terminals = vscode.window.terminals.filter(condition);
  if (terminals.length === 0) {
    return;
  }

  terminals.forEach((i) => i.dispose());

  await AsyncRetry(
    async () => {
      const terminal = vscode.window.terminals.find(condition);
      assert(!terminal, "close old terminal error");

      if (!terminal) {
        await new Promise((res) => {
          setTimeout(res, 1_000);
        });
      }
    },
    {
      randomize: false,
      retries: 3,
    }
  );
}

export async function waitForSync(node: ControllerResourceNode) {
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
  let container: ContainerConfig | undefined;

  let serviceConfig = node.nocalhostService;
  if (!serviceConfig) {
    serviceConfig = (await ConfigService.getAppConfig(
      node.getKubeConfigPath(),
      node.getNameSpace(),
      node.getAppName(),
      node.name,
      node.resourceType
    )) as NocalhostServiceConfig;
  }
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
