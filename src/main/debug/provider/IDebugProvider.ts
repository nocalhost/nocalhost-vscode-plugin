import { basename } from "path";
import { debug, DebugConfiguration, workspace } from "vscode";

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
    node: ControllerResourceNode,
    podName: string
  ): Promise<boolean> {
    const currentFolder = (workspace.workspaceFolders || []).find(
      (folder) => folder.name === basename(workspaceFolder)
    );

    return await debug.startDebugging(
      currentFolder,
      this.getDebugConfiguration(
        debugSessionName,
        container.dev.debug.remoteDebugPort,
        container.dev.workDir ?? "/home/nocalhost-dev"
      )
    );
  }
}
