import * as vscode from "vscode";
import * as path from "path";

import host from "../../host";

export abstract class IDebugProvider {
  name: string = null;
  requireExtensions: Array<string> = [];

  abstract startDebug(
    workspaceFolder: string,
    sessionName: string,
    port: number,
    workDir: string,
    terminatedCallback?: Function
  ): Promise<boolean>;

  async startDebugging(
    workspaceFolder: string,
    config: vscode.DebugConfiguration & { port: number },
    terminatedCallback?: Function
  ): Promise<boolean> {
    const { name } = config;

    const currentFolder = (vscode.workspace.workspaceFolders || []).find(
      (folder) => folder.name === path.basename(workspaceFolder)
    );

    const disposables: vscode.Disposable[] = [
      vscode.debug.onDidStartDebugSession((debugSession) => {
        if (debugSession.name === name) {
          host.log(
            "The debug session has started. Your application is ready for you to debug.",
            true
          );
        }
      }),
      vscode.debug.onDidTerminateDebugSession(async (debugSession) => {
        if (debugSession.name === name) {
          disposables.forEach((d) => d.dispose());
          terminatedCallback && terminatedCallback();

          host.log("Terminated debug session", true);
        }
      }),
    ];

    return vscode.debug.startDebugging(currentFolder, config);
  }
  public async isDebuggerInstalled() {
    if (
      this.requireExtensions.length > 0 &&
      !this.existExtensions(this.requireExtensions)
    ) {
      return await this.installExtension(this.requireExtensions);
    }

    return Promise.resolve(true);
  }

  private existExtensions(extensionArray: string[]) {
    return extensionArray.every(vscode.extensions.getExtension);
  }
  /**
   * install
   */
  private async installExtension(extensionArray: string[]) {
    let answer = await vscode.window.showInformationMessage(
      `Debugger for ${this.name} requires extension. Would you like to install it now?`,
      "Install Now"
    );

    if (!answer) {
      return;
    }

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification },
      async (p) => {
        p.report({ message: `Installing debugger for ${this.name} ...` });

        for (const id of extensionArray) {
          await vscode.commands.executeCommand(
            "workbench.extensions.installExtension",
            id
          );
        }
      }
    );

    const RELOAD = "Reload Window";
    const choice = await vscode.window.showInformationMessage(
      "Please reload window to activate Language Support for Java.",
      RELOAD
    );
    if (choice === RELOAD) {
      await vscode.commands.executeCommand("workbench.action.reloadWindow");
    }

    return false;
  }
}
