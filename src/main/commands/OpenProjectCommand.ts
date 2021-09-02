import { existsSync } from "fs";
import * as vscode from "vscode";
import { getServiceConfig, associate } from "../ctl/nhctl";
import host from "../host";
import { OPEN_PROJECT } from "./constants";
import ICommand from "./ICommand";
import registerCommand from "./register";
import { ControllerNodeApi } from "./StartDevModeCommand";
import * as os from "os";

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

    const kubeConfigPath = node.getKubeConfigPath();
    const namespace = node.getNameSpace();
    const appName = node.getAppName();

    const profile = await getServiceConfig(
      kubeConfigPath,
      namespace,
      appName,
      node.name,
      node.resourceType
    );

    if (profile.associate) {
      if (!existsSync(profile.associate)) {
        host.showInformationMessage(
          "The directory does not exist,you are not associated with source directory"
        );
        return;
      }
      const currentUri = host.getCurrentRootPath();

      const uri = vscode.Uri.file(profile.associate);

      if (currentUri !== uri.fsPath) {
        vscode.commands.executeCommand("vscode.openFolder", uri, true);
      }
    } else {
      const currentUri = host.getCurrentRootPath();

      const selectUri = await host.showSelectFolderDialog(
        "Open Project",
        vscode.Uri.file(currentUri || os.homedir())
      );

      if (selectUri && selectUri.length > 0) {
        await associate(
          kubeConfigPath,
          namespace,
          appName,
          selectUri[0].fsPath,
          node.resourceType,
          node.name
        );
        vscode.commands.executeCommand("vscode.openFolder", selectUri[0], true);
      }
    }
  }
}
