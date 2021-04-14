import * as vscode from "vscode";
import * as path from "path";

import ICommand from "./ICommand";
import { REFRESH, UNINSTALL_APP } from "./constants";
import registerCommand from "./register";
import state from "../state";
import host, { Host } from "../host";
import { KUBE_CONFIG_DIR } from "../constants";
import { updateAppInstallStatus } from "../api";
import * as nhctl from "../ctl/nhctl";
import { AppNode } from "../nodes/AppNode";
import { DevSpaceNode } from "../nodes/DevSpaceNode";
import messageBus from "../utils/messageBus";

export default class UninstallCommand implements ICommand {
  command: string = UNINSTALL_APP;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, true, this.execCommand.bind(this));
  }
  async execCommand(appNode: AppNode) {
    if (!appNode) {
      host.showWarnMessage("A task is running, please try again later");
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

    state.setAppState(appNode.name, "uninstalling", true);
    const devspace = appNode.getParent() as DevSpaceNode;
    messageBus.emit("uninstall", {
      devspaceName: devspace.info.spaceName,
      appName: appNode.name,
    });
    host.disposeApp(devspace.info.spaceName, appNode.name);
    await this.uninstall(
      host,
      appNode.getKubeConfigPath(),
      appNode.name,
      appNode.id,
      appNode.devSpaceId
    ).finally(() => {
      state.deleteAppState(appNode.name, "uninstalling");
      devspace.updateData();
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
    host.getOutputChannel().show(true);
    await nhctl.uninstall(host, kubeconfigPath, appName, true);
    host.removeGlobalState(appName);
    state.delete(appName);
  }

  private getKubeConfigPath(appNode: AppNode): string {
    const { id, devSpaceId } = appNode;
    return path.resolve(KUBE_CONFIG_DIR, `${id}_${devSpaceId}_config`);
  }
}
