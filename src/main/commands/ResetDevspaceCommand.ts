import * as vscode from "vscode";

import ICommand from "./ICommand";
import { RESET_DEVSPACE } from "./constants";
import registerCommand from "./register";
import state from "../state";
import host, { Host } from "../host";
import { resetDevspace } from "../api";
import * as nhctl from "../ctl/nhctl";
import { DevSpaceNode } from "../nodes/DevSpaceNode";

export default class ResetDevspaceCommand implements ICommand {
  command: string = RESET_DEVSPACE;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, true, this.execCommand.bind(this));
  }
  async execCommand(node: DevSpaceNode) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    const result = await host.showInformationMessage(
      `Reset devspace: ${node.info.spaceName}?`,
      { modal: true },
      `OK`
    );
    if (!result) {
      return;
    }

    state.setAppState(node.info.spaceName, "uninstalling", true);
    vscode.commands.executeCommand("Nocalhost.refresh");
    host.disposeDevspace(node.info.spaceName);
    await this.reset(
      host,
      node.getKubeConfigPath(),
      node.info.spaceName
    ).finally(async () => {
      await resetDevspace(node.info.id);
      vscode.commands.executeCommand("Nocalhost.refresh");
      host.showInformationMessage(`reset ${node.info.spaceName}`);
    });
  }

  private async reset(
    host: Host,
    kubeconfigPath: string,
    devspaceName: string
  ) {
    host.log(`Reseting devspace: ${devspaceName}`, true);
    host.showInformationMessage(`Reseting devspace: ${devspaceName}`);
    await nhctl.resetApp(kubeconfigPath, devspaceName);
    // await updateAppInstallStatus(appId, devSpaceId, 0);
    host.removeGlobalState(devspaceName);
    state.delete(devspaceName);
    host.log(`Devspace ${devspaceName} reset`, true);
    host.showInformationMessage(`Devspace ${devspaceName} reset`);
  }
}
