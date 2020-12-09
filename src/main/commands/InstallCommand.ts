import * as vscode from "vscode";
import * as path from "path";

import ICommand from "./ICommand";
import { INSTALL_APP } from "./constants";
import registerCommand from "./register";
import state from "../state";
import { AppFolderNode, NocalhostAccountNode } from "../nodes/nodeType";
import host from "../host";
import nocalhostService from "../service/nocalhostService";
import { KUBE_CONFIG_DIR, SELECTED_APP_NAME } from "../constants";
import * as fileStore from "../store/fileStore";

export default class InstallCommand implements ICommand {
  command: string = INSTALL_APP;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, true, this.execCommand.bind(this));
  }
  async execCommand(appNode: AppFolderNode) {
    state.setAppState(appNode.label, "installing", true, {
      refresh: true,
      node: appNode,
    });
    const currentKubeConfigFullpath = this.getKubeConfigPath(appNode);
    fileStore.set(SELECTED_APP_NAME, appNode.info.name);
    fileStore.set(currentKubeConfigFullpath, currentKubeConfigFullpath);
    vscode.commands.executeCommand("Nocalhost.refresh");
    // make siblings collapsis
    const siblings: (
      | AppFolderNode
      | NocalhostAccountNode
    )[] = await appNode.siblings();
    siblings.forEach((item) => {
      const node = item as AppFolderNode;
      node.collapsis();
    });

    await nocalhostService
      .install(
        host,
        appNode.info.name,
        appNode.id,
        appNode.devSpaceId,
        appNode.info.url,
        appNode.installType,
        appNode.resourceDir
      )
      .finally(() => {
        state.deleteAppState(appNode.label, "installing");
        appNode.expanded();
        appNode.expandWorkloadNode();
        vscode.commands.executeCommand("Nocalhost.refresh");
      });
  }

  private getKubeConfigPath(appNode: AppFolderNode): string {
    const { id, devSpaceId } = appNode;
    return path.resolve(KUBE_CONFIG_DIR, `${id}_${devSpaceId}_config`);
  }
}
