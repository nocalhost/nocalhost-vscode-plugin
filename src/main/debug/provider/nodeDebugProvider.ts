import Axios from "axios";
import { DebugConfiguration } from "vscode";

import { IDebugProvider } from "./IDebugProvider";

export class NodeDebugProvider extends IDebugProvider {
  name: string = "node";
  requireExtensions: string[] = [];

  downloadUrl: string = "https://nodejs.org/en/download/";
  commandName: string = this.name;

  getDebugConfiguration(
    name: string,
    port: number,
    remoteRoot: string
  ): DebugConfiguration {
    //https://code.visualstudio.com/docs/nodejs/nodejs-debugging

    return {
      type: "node",
      request: "attach",
      name,
      address: "localhost",
      skipFiles: ["<node_internals>/**/*.js"],
      port,
      sourceMaps: true,
      localRoot: "${workspaceRoot}",
      remoteRoot,
    };
  }
  async waitDebuggerStart(port: number) {
    return Axios.get(`http://127.0.0.1:${port}/json`);
  }
}
