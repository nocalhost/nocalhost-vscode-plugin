import * as vscode from "vscode";

import { IDebugProvider } from "./iDebugProvider";

export class JavaDebugProvider extends IDebugProvider {
  name: "java";
  requireExtensions: ["vscjava.vscode-java-debug", "redhat.java"];

  async startDebug(
    workspaceFolder: string,
    sessionName: string,
    port: number,
    workDir: string
  ): Promise<boolean> {
    const debugConfiguration: vscode.DebugConfiguration = {
      type: "java",
      name: sessionName,
      projectName: sessionName,
      remotePath: workDir || "/home/nocalhost-dev/",
      localRoot: "${workspaceRoot}",
      request: "attach",
      hostName: "localhost",
      port,
    };

    return super.startDebugging(workspaceFolder, debugConfiguration);
  }
}
