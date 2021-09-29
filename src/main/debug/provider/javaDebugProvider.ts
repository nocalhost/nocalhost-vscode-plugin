import * as vscode from "vscode";
const retry = require("async-retry");

import { IDebugProvider } from "./IDebugProvider";
import { ControllerResourceNode } from "../../nodes/workloads/controllerResources/ControllerResourceNode";
import { ContainerConfig } from "../../service/configService";

export class JavaDebugProvider extends IDebugProvider {
  name: string;
  requireExtensions: string[];
  constructor() {
    super();
    this.name = "Java";
    this.requireExtensions = ["vscjava.vscode-java-debug", "redhat.java"];
  }

  getDebugConfiguration(
    name: string,
    port: number,
    remotePath: string
  ): vscode.DebugConfiguration {
    // https://code.visualstudio.com/docs/java/java-debugging
    return {
      type: "java",
      name,
      request: "attach",
      hostName: "localhost",
      port,
    };
  }
  async startDebugging(
    workspaceFolder: string,
    debugSessionName: string,
    container: ContainerConfig,
    port: number,
    node: ControllerResourceNode
  ): Promise<boolean> {
    await this.waitForReady(container, node);

    return super.startDebugging(
      workspaceFolder,
      debugSessionName,
      container,
      port,
      node
    );
  }

  async waitForReady(container: ContainerConfig, node: ControllerResourceNode) {
    // await retry(() => waitForRemoteDebugPortReady(container, node, podName), {
    //   randomize: false,
    //   retries: 6,
    // });
  }
}
