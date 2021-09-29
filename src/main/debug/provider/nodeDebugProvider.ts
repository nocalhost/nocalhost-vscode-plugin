import Axios from "axios";
import { DebugConfiguration } from "vscode";
const retry = require("async-retry");

import { IDebugProvider } from "./IDebugProvider";
import { ControllerResourceNode } from "../../nodes/workloads/controllerResources/ControllerResourceNode";
import { ContainerConfig } from "../../service/configService";

export class NodeDebugProvider extends IDebugProvider {
  name: string;
  requireExtensions: string[];

  constructor() {
    super();

    this.name = "Node";
    this.requireExtensions = [];
  }

  getDebugConfiguration(
    name: string,
    port: number,
    remoteRoot: string
  ): DebugConfiguration {
    //https://github.dev/microsoft/vscode-js-debug/blob/a570239f82641de25583ccdaadf9c0903c1a6a78/src/targets/node/restartPolicy.ts

    return {
      type: "node",
      request: "attach",
      name,
      hostName: "localhost",
      skipFiles: ["<node_internals>/**/*.js"],
      port,
      sourceMaps: true,
      localRoot: "${workspaceRoot}",
      remoteRoot,
      //nodemon
      // restart: {
      //   delay: 500,
      //   maxAttempts: 10,
      // },
    };
  }
  async startDebugging(
    workspaceFolder: string,
    debugSessionName: string,
    container: ContainerConfig,
    port: number,
    node: ControllerResourceNode
  ): Promise<boolean> {
    await this.waitForReady(container.dev.debug.remoteDebugPort);

    return super.startDebugging(
      workspaceFolder,
      debugSessionName,
      container,
      port,
      node
    );
  }

  async waitForReady(port: number) {
    try {
      await retry(() => Axios.get(`http://127.0.0.1:${port}/json`), {
        randomize: false,
        retries: 6,
      });
    } catch (error) {
      throw new Error(
        "The attempt to connect to the remote debug port timed out."
      );
    }
  }
}
