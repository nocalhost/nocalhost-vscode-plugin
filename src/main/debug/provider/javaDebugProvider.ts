import * as vscode from "vscode";
const retry = require("async-retry");

import { IDebugProvider } from "./IDebugProvider";
import { ControllerResourceNode } from "../../nodes/workloads/controllerResources/ControllerResourceNode";
import { ContainerConfig } from "../../service/configService";
import { waitForRemoteDebugPortReady } from "..";

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
    node: ControllerResourceNode,
    podName: string
  ): Promise<boolean> {
    await this.waitForReady(container, node, podName);

    return super.startDebugging(
      workspaceFolder,
      debugSessionName,
      container,
      node,
      podName
    );
  }

  async waitForReady(
    container: ContainerConfig,
    node: ControllerResourceNode,
    podName: string
  ) {
    await retry(() => waitForRemoteDebugPortReady(container, node, podName), {
      randomize: false,
      retries: 6,
    });
  }
}
