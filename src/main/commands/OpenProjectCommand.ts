import * as vscode from "vscode";
import host from "../host";
import { OPEN_PROJECT } from "./constants";
import ICommand from "./ICommand";
import registerCommand from "./register";
import { ControllerNodeApi } from "./StartDevModeCommand";

export default class OpenProjectCommand implements ICommand {
  command: string = OPEN_PROJECT;
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    registerCommand(context, this.command, true, this.execCommand.bind(this));
  }

  async execCommand(node: ControllerNodeApi) {
    if (!node) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }
    const status = await node.getStatus();
    if (status !== "developing") {
      return;
    }

    const appName = node.getAppName();
    let appConfig = host.getGlobalState(appName) || {};
    let workloadConfig: { directory: string } = appConfig[node.name] || {};

    if (workloadConfig.directory) {
      const currentUri = host.getCurrentRootPath();

      const uri = vscode.Uri.file(workloadConfig.directory);

      if (currentUri !== uri.fsPath) {
        vscode.commands.executeCommand("vscode.openFolder", uri, true);
      }
    } else {
      host.showInformationMessage(
        "You are not associated with source directory"
      );
    }
  }
}
