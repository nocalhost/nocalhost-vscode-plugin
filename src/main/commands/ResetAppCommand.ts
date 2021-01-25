import * as vscode from "vscode";

import ICommand from "./ICommand";
import { RESET_APP } from "./constants";
import registerCommand from "./register";
import state from "../state";
import host, { Host } from "../host";
import * as fileStore from "../store/fileStore";
import { updateAppInstallStatus, resetApp } from "../api";
import * as nhctl from "../ctl/nhctl";
import { AppNode } from "../nodes/AppNode";

export default class ResetAppCommand implements ICommand {
  command: string = RESET_APP;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, true, this.execCommand.bind(this));
  }
  async execCommand(appNode: AppNode) {
    if (!appNode) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    const result = await host.showInformationMessage(
      `Reset application: ${appNode.name}?`,
      { modal: true },
      `OK`
    );
    if (!result) {
      return;
    }

    state.setAppState(appNode.name, "uninstalling", true);
    appNode.collapsis();
    vscode.commands.executeCommand("Nocalhost.refresh");
    await this.uninstall(
      host,
      appNode.getKubeConfigPath(),
      appNode.name,
      appNode.id,
      appNode.devSpaceId
    ).finally(async () => {
      state.deleteAppState(appNode.name, "uninstalling");
      await resetApp(appNode.devSpaceId);
      vscode.commands.executeCommand("Nocalhost.refresh");
      host.showInformationMessage(`reset ${appNode.name}`);
    });
  }

  private async uninstall(
    host: Host,
    kubeconfigPath: string,
    appName: string,
    appId: number,
    devSpaceId: number
  ) {
    host.log(`Uninstalling application: ${appName}`, true);
    host.showInformationMessage(`Uninstalling application: ${appName}`);
    await nhctl.uninstall(host, kubeconfigPath, appName);
    await updateAppInstallStatus(appId, devSpaceId, 0);
    fileStore.remove(appName);
    state.delete(appName);
    host.log(`Application ${appName} uninstalled`, true);
    host.showInformationMessage(`Application ${appName} uninstalled`);
  }
}
