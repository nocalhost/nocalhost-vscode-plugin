import { basename } from "path";
import {
  CancellationTokenSource,
  debug,
  DebugConfiguration,
  workspace,
} from "vscode";
import * as AsyncRetry from "async-retry";
import { merge, omit } from "lodash";

import { ControllerResourceNode } from "../../nodes/workloads/controllerResources/ControllerResourceNode";
import { ContainerConfig } from "../../service/configService";
import logger from "../../utils/logger";
import { portForward } from "..";

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

  async checkDebuggerDependent() {
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
  async getRemotePort(
    node: ControllerResourceNode,
    container: ContainerConfig
  ) {
    return await portForward(node, container, "start");
  }
  async startDebugging(
    workspaceFolder: string,
    debugSessionName: string,
    container: ContainerConfig,
    port: number,
    node: ControllerResourceNode,
    cancellationToken: CancellationTokenSource,
    config: DebugConfiguration
  ): Promise<boolean> {
    const currentFolder = (workspace.workspaceFolders || []).find(
      (folder) => folder.name === basename(workspaceFolder)
    );

    await this.waitForReady(port, cancellationToken);

    if (cancellationToken?.token.isCancellationRequested) {
      return;
    }

    const otherConfig = omit(config, "type", "name", "request");

    const debugConfiguration = this.getDebugConfiguration(
      debugSessionName,
      port,
      container.dev.workDir ?? "/home/nocalhost-dev"
    );

    config = merge(debugConfiguration, otherConfig);

    return await debug.startDebugging(currentFolder, config);
  }
}
