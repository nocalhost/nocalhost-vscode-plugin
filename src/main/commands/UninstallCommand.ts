import * as vscode from "vscode";
import * as path from "path";

import ICommand from "./ICommand";
import { UNINSTALL_APP } from "./constants";
import registerCommand from "./register";
import state from "../state";
import { AppFolderNode } from "../nodes/nodeType";
import host from "../host";
import nocalhostService from "../service/nocalhostService";
import { KUBE_CONFIG_DIR, SELECTED_APP_NAME } from "../constants";
import * as fileStore from "../store/fileStore";

export default class UninstallCommand implements ICommand {
  command: string = UNINSTALL_APP;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, true, this.execCommand.bind(this));
  }
  async execCommand(appNode: AppFolderNode) {
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
    fileStore.set(currentKubeConfigFullpath, currentKubeConfigFullpath);
    vscode.commands.executeCommand("Nocalhost.refresh");
    await nocalhostService
      .uninstall(host, appNode.info.name, appNode.id, appNode.devSpaceId)
      .finally(() => {
        state.deleteAppState(appNode.label, "uninstalling");
        vscode.commands.executeCommand("Nocalhost.refresh");
      });
  }

  private getKubeConfigPath(appNode: AppFolderNode): string {
    const { id, devSpaceId } = appNode;
    return path.resolve(KUBE_CONFIG_DIR, `${id}_${devSpaceId}_config`);
  }
}
