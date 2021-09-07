import * as vscode from "vscode";
import { IDebugProvider } from "./IDebugprovider";

export class NodeDebugProvider extends IDebugProvider {
  async startDebug(
    workspaceFolder: string,
    sessionName: string,
    port: number,
    workDir: string,
    terminatedCallback?: Function
  ): Promise<boolean> {
    const debugConfiguration: vscode.DebugConfiguration = {
      type: "node",
      request: "attach",
      name: sessionName,
      hostName: "localhost",
      skipFiles: ["<node_internals>/**/*.js"],
      port,
      sourceMaps: true,
      localRoot: "${workspaceRoot}",
      remoteRoot: workDir || "/home/nocalhost-dev/",
    };

    return super.startDebugging(
      workspaceFolder,
      debugConfiguration,
      terminatedCallback
    );
  }
}
