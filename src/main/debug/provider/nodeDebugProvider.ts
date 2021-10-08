import Axios from "axios";
import { DebugConfiguration } from "vscode";

import { IDebugProvider } from "./IDebugProvider";

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
  async waitDebuggerStart(port: number) {
    return Axios.get(`http://127.0.0.1:${port}/json`);
  }
}
