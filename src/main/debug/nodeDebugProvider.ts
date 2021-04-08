import * as vscode from "vscode";
import * as path from "path";
import { IDebugProvider } from "./IDebugprovider";
import host from "../host";

export class NodeDebugProvider extends IDebugProvider {
  async startDebug(
    workspaceFolder: string,
    sessionName: string,
    port: number,
    workDir: string,
    terminatedCallback: () => any
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
    const currentFolder = (vscode.workspace.workspaceFolders || []).find(
      (folder) => folder.name === path.basename(workspaceFolder)
    );
    const disposables: vscode.Disposable[] = [];
    disposables.push(
      vscode.debug.onDidStartDebugSession((debugSession) => {
        if (debugSession.name === sessionName) {
          host.log(
            "The debug session has started. Your application is ready for you to debug.",
            true
          );
        }
      })
    );

    disposables.push(
      vscode.debug.onDidTerminateDebugSession(async (debugSession) => {
        if (debugSession.name === sessionName) {
          disposables.forEach((d) => d.dispose());
          await terminatedCallback();
          host.log("Terminated debug session", true);
        }
      })
    );
    return await vscode.debug.startDebugging(currentFolder, debugConfiguration);
  }
}
