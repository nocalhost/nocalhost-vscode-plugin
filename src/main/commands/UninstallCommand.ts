import * as vscode from "vscode";
import * as path from "path";

import ICommand from "./ICommand";
import { UNINSTALL_APP } from "./constants";
import registerCommand from "./register";
import state from "../state";
import host, { Host } from "../host";
import {
  CURRENT_KUBECONFIG_FULLPATH,
  KUBE_CONFIG_DIR,
  SELECTED_APP_NAME,
} from "../constants";
import * as fileStore from "../store/fileStore";
import { updateAppInstallStatus } from "../api";
import * as nhctl from "../ctl/nhctl";
import { AppNode } from "../nodes/AppNode";

export default class UninstallCommand implements ICommand {
  command: string = UNINSTALL_APP;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, true, this.execCommand.bind(this));
  }
  async execCommand(appNode: AppNode) {
    const result = await host.showInformationMessage(
      `Uninstall application: ${appNode.label}?`,
      { modal: true },
      `OK`
    );
    if (!result) {
      return;
    }

    state.setAppState(appNode.label, "uninstalling", true);
    appNode.collapsis();
    const currentKubeConfigFullpath = this.getKubeConfigPath(appNode);
    fileStore.set(SELECTED_APP_NAME, appNode.info.name);
    fileStore.set(CURRENT_KUBECONFIG_FULLPATH, currentKubeConfigFullpath);
    vscode.commands.executeCommand("Nocalhost.refresh");
    await this.uninstall(
      host,
      appNode.info.name,
      appNode.id,
      appNode.devSpaceId
    ).finally(() => {
      state.deleteAppState(appNode.label, "uninstalling");
      vscode.commands.executeCommand("Nocalhost.refresh");
    });
  }

  private async uninstall(
    host: Host,
    appName: string,
    appId: number,
    devSpaceId: number
  ) {
    host.log(`Uninstalling application: ${appName}`, true);
    host.showInformationMessage(`Uninstalling application: ${appName}`);
    await nhctl.uninstall(host, appName);
    await updateAppInstallStatus(appId, devSpaceId, 0);
    fileStore.remove(appName);
    state.delete(appName);
    host.log(`Application ${appName} uninstalled`, true);
    host.showInformationMessage(`Application ${appName} uninstalled`);
  }

  private getKubeConfigPath(appNode: AppNode): string {
    const { id, devSpaceId } = appNode;
    return path.resolve(KUBE_CONFIG_DIR, `${id}_${devSpaceId}_config`);
  }
}
