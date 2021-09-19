import * as vscode from "vscode";
import * as path from "path";
import { IDebugProvider } from "./iDebugProvider";
import host from "../../host";
export class JavaDebugProvider extends IDebugProvider {
  name: "java";
  requireExtensions: ["vscjava.vscode-java-debug", "redhat.java"];

  async startDebug(
    workspaceFolder: string,
    sessionName: string,
    port: number,
    workDir: string,
    terminatedCallback: () => any
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
