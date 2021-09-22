import * as vscode from "vscode";
import * as path from "path";

export abstract class IDebugProvider {
  name: string = null;
  requireExtensions: Array<string> = [];

  abstract startDebug(
    workspaceFolder: string,
    sessionName: string,
    port: number,
    workDir: string
  ): Promise<boolean>;

  async startDebugging(
    workspaceFolder: string,
    config: vscode.DebugConfiguration & { port: number }
  ): Promise<boolean> {
    const currentFolder = (vscode.workspace.workspaceFolders || []).find(
      (folder) => folder.name === path.basename(workspaceFolder)
    );

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
