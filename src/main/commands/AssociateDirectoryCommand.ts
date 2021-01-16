import * as vscode from "vscode";
import * as os from "os";

import ICommand from "./ICommand";

import { ASSOCIATE_LOCAL_DIRECTORY } from "./constants";
import registerCommand from "./register";
import { Deployment } from "../nodes/workloads/controllerResources/deployment/Deployment";
import host from "../host";
import * as fileStore from "../store/fileStore";

export default class AssociateLocalDirectoryCommand implements ICommand {
  command: string = ASSOCIATE_LOCAL_DIRECTORY;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: Deployment) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    let appName: string, workloadName: string | undefined;
    appName = node.getAppName();
    workloadName = node.name;

    let appConfig = fileStore.get(appName) || {};
    let workloadConfig = appConfig[node.name] || {};
    const currentUri = this.getCurrentRootPath();
    let destDir = workloadConfig.directory;
    const selectUri = await host.showSelectFolderDialog(
      "Associate local directory",
      vscode.Uri.file(destDir || currentUri || os.homedir())
    );
    if (selectUri && selectUri.length > 0) {
      workloadConfig.directory = selectUri[0].fsPath;
      fileStore.set(appName, appConfig);
    }
  }

  private getCurrentRootPath() {
    return (
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0 &&
      vscode.workspace.workspaceFolders[0].uri.fsPath
    );
  }
}
