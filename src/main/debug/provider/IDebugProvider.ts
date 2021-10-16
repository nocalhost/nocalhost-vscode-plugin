import { basename } from "path";
import {
  CancellationTokenSource,
  debug,
  DebugConfiguration,
  workspace,
} from "vscode";
import * as AsyncRetry from "async-retry";

import { ControllerResourceNode } from "../../nodes/workloads/controllerResources/ControllerResourceNode";
import { ContainerConfig } from "../../service/configService";
import logger from "../../utils/logger";
import host from "../../host";

export abstract class IDebugProvider {
  abstract name: string;
  abstract requireExtensions: Array<string>;

  abstract getDebugConfiguration(
    name: string,
    port: number,
    remoteRoot: string
  ): DebugConfiguration;

  async waitDebuggerStop() {
    return Promise.resolve();
  }

  async waitDebuggerStart(port: number): Promise<any> {
    return Promise.resolve();
  }

  async waitForReady(port: number, cancellationToken: CancellationTokenSource) {
    await AsyncRetry(
      async (bail) => {
        if (cancellationToken.token.isCancellationRequested) {
          bail(new Error());
          return;
        }

        try {
          await this.waitDebuggerStart(port);
        } catch (error) {
          logger.error(`waitForReady`, this.name, error);

          throw new Error(
            "The attempt to connect to the remote debug port timed out."
          );
        }
      },
      {
        randomize: false,
        maxTimeout: 1000,
        retries: 5 * 60,
      }
    );
  }

  async startDebugging(
    workspaceFolder: string,
    debugSessionName: string,
    container: ContainerConfig,
    port: number,
    node: ControllerResourceNode,
    cancellationToken?: CancellationTokenSource
  ): Promise<boolean> {
    const currentFolder = (workspace.workspaceFolders || []).find(
      (folder) => folder.name === basename(workspaceFolder)
    );

    await this.waitForReady(port, cancellationToken);

    if (cancellationToken.token.isCancellationRequested) {
      return;
    }

    return await debug.startDebugging(
      currentFolder,
      this.getDebugConfiguration(
        debugSessionName,
        port,
        container.dev.workDir ?? "/home/nocalhost-dev"
      )
    );
  }
}
