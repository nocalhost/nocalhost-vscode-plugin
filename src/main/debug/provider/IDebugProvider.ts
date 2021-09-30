import { basename } from "path";
import {
  CancellationTokenSource,
  debug,
  DebugConfiguration,
  workspace,
} from "vscode";

import { ControllerResourceNode } from "../../nodes/workloads/controllerResources/ControllerResourceNode";
import { ContainerConfig } from "../../service/configService";

export abstract class IDebugProvider {
  abstract name: string;
  abstract requireExtensions: Array<string>;

  abstract getDebugConfiguration(
    name: string,
    port: number,
    remoteRoot: string
  ): DebugConfiguration;

  async waitStopDebug() {
    return Promise.resolve();
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
