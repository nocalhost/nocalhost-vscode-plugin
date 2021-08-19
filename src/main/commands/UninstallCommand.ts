import * as vscode from "vscode";

import ICommand from "./ICommand";
import { UNINSTALL_APP } from "./constants";
import registerCommand from "./register";
import state from "../state";
import host, { Host } from "../host";
import * as nhctl from "../ctl/nhctl";
import { AppNode } from "../nodes/AppNode";
import { DevSpaceNode } from "../nodes/DevSpaceNode";
import messageBus from "../utils/messageBus";
import Bookinfo from "../common/bookinfo";

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

    await state.cleanAutoRefresh(appNode);

    state.setAppState(appNode.getNodeStateId(), "uninstalling", true);

    await vscode.commands.executeCommand("Nocalhost.refresh", appNode);

    const devspace = appNode.getParent() as DevSpaceNode;

    messageBus.emit("uninstall", {
      devspaceName: devspace.info.spaceName,
      appName: appNode.name,
    });

    host.disposeApp(devspace.info.spaceName, appNode.name);

    Bookinfo.cleanCheck(appNode);

    await this.uninstall(
      host,
      appNode.getKubeConfigPath(),
      appNode.namespace,
      appNode.name
    ).finally(async () => {
      state.delete(appNode.getNodeStateId());

      await devspace.updateData();

      await vscode.commands.executeCommand("Nocalhost.refresh", devspace);
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
}
