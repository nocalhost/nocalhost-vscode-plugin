import * as vscode from "vscode";
import { IDebugProvider } from "./IDebugprovider";

export class GoDebugProvider extends IDebugProvider {
  async startDebug(
    workspaceFolder: string,
    sessionName: string,
    port: number,
    workDir: string,
    terminatedCallback: Function
  ): Promise<boolean> {
    const debugConfiguration: vscode.DebugConfiguration = {
      name: sessionName,
      type: "go",
      request: "attach",
      mode: "remote",
      remotePath: workDir || "/home/nocalhost-dev/",
      localRoot: "${workspaceRoot}",
      port,
      host: "localhost",
      // trace: "verbose", // check debug step
      // NOT SUPPORT CWD, will occur error
    };

    return super.startDebugging(
      workspaceFolder,
      debugConfiguration,
      terminatedCallback
    );
  }

  public async isDebuggerInstalled(): Promise<boolean> {
    if (vscode.extensions.getExtension("golang.go")) {
      return true;
    }

    return super.installExtension("golang", ["golang.go"]);
  }
}
