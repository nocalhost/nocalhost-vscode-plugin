import * as vscode from "vscode";
import * as path from "path";

import ICommand from "./ICommand";
import { INSTALL_APP } from "./constants";
import registerCommand from "./register";
import state from "../state";
import host, { Host } from "../host";
import * as fileStore from "../store/fileStore";
import { updateAppInstallStatus } from "../api";
import * as nhctl from "../ctl/nhctl";
import { AppNode } from "../nodes/AppNode";
import { NocalhostAccountNode } from "../nodes/NocalhostAccountNode";

export default class InstallCommand implements ICommand {
  command: string = INSTALL_APP;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, true, this.execCommand.bind(this));
  }
  async execCommand(appNode: AppNode) {
    state.setAppState(appNode.label, "installing", true, {
      refresh: true,
      node: appNode,
    });
    vscode.commands.executeCommand("Nocalhost.refresh");
    // make siblings collapsis
    const siblings: (
      | AppNode
      | NocalhostAccountNode
    )[] = await appNode.siblings();
    siblings.forEach((item) => {
      const node = item as AppNode;
      node.collapsis();
    });

    await this.install(
      host,
      appNode.getKUbeconfigPath(),
      appNode.info.name,
      appNode.id,
      appNode.devSpaceId,
      appNode.info.url,
      appNode.installType,
      appNode.resourceDir
    ).finally(() => {
      state.deleteAppState(appNode.label, "installing");
      appNode.expanded();
      appNode.expandWorkloadNode();
      vscode.commands.executeCommand("Nocalhost.refresh");
    });
  }

  private async install(
    host: Host,
    kubeconfigPath: string,
    appName: string,
    appId: number,
    devSpaceId: number,
    gitUrl: string,
    installType: string,
    resourceDir: Array<string>
  ) {
    // tips
    let values: string | undefined;
    if (["helm", "helm-repo"].includes(installType)) {
      const res = await host.showInformationMessage(
        "Do you want to specify a values.yaml?",
        { modal: true },
        "Specify One",
        "Use Default values"
      );
      if (!res) {
        return;
      }
      if (res === "Specify One") {
        const valuesUri = await host.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          title: "Select the value file path",
        });

        if (valuesUri) {
          values = valuesUri[0].path;
        }
      }
    }
    host.log(`Installing application: ${appName}`, true);
    host.showInformationMessage(`Installing application: ${appName}`);
    await nhctl.install(
      host,
      kubeconfigPath,
      appName,
      gitUrl,
      installType,
      resourceDir,
      values
    );
    await updateAppInstallStatus(appId, devSpaceId, 1);
    fileStore.set(appName, {});
    host.log(`Application ${appName} installed`, true);
    host.showInformationMessage(`Application ${appName} installed`);
  }
}
