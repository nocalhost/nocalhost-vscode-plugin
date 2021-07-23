import * as vscode from "vscode";
import * as path from "path";

import ICommand from "./ICommand";
import { REFRESH, UNINSTALL_APP } from "./constants";
import registerCommand from "./register";
import state from "../state";
import host, { Host } from "../host";
import { KUBE_CONFIG_DIR } from "../constants";
import * as nhctl from "../ctl/nhctl";
import { AppNode } from "../nodes/AppNode";
import { DevSpaceNode } from "../nodes/DevSpaceNode";
import messageBus from "../utils/messageBus";
import { NocalhostFolderNode } from "../nodes/abstract/NocalhostFolderNode";
import { BaseNocalhostNode } from "../nodes/types/nodeType";

export default class UninstallCommand implements ICommand {
  command: string = UNINSTALL_APP;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, true, this.execCommand.bind(this));
  }
  async execCommand(appNode: AppNode) {
    if (!appNode) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }
    const result = await host.showInformationMessage(
      `Uninstall application: ${appNode.name}?`,
      { modal: true },
      `OK`
    );
    if (!result) {
      return;
    }

    host.stopAutoRefresh();

    await state.cleanAutoRefresh(appNode);

    state.setAppState(appNode.name, "uninstalling", true);

    await vscode.commands.executeCommand("Nocalhost.refresh");

    const devspace = appNode.getParent() as DevSpaceNode;
    messageBus.emit("uninstall", {
      devspaceName: devspace.info.spaceName,
      appName: appNode.name,
    });
    host.disposeApp(devspace.info.spaceName, appNode.name);

    host.startAutoRefresh();

    await this.uninstall(
      host,
      appNode.getKubeConfigPath(),
      appNode.namespace,
      appNode.name
    ).finally(() => {
      state.deleteAppState(appNode.name, "uninstalling");
      devspace.updateData();
    });
  }
  private async uninstall(
    host: Host,
    kubeconfigPath: string,
    namespace: string,
    appName: string
  ) {
    host.log(`Uninstalling application: ${appName}`, true);
    host.getOutputChannel().show(true);
    await nhctl.uninstall(host, kubeconfigPath, namespace, appName, true);
    host.removeGlobalState(appName);
    state.delete(appName);
  }

  private getKubeConfigPath(appNode: AppNode): string {
    const { id, devSpaceId } = appNode;
    return path.resolve(KUBE_CONFIG_DIR, `${id}_${devSpaceId}_config`);
  }
}
