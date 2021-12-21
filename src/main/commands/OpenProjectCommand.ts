import { existsSync } from "fs";
import * as vscode from "vscode";
import { associateInfo, NhctlCommand } from "../ctl/nhctl";
import host from "../host";
import { OPEN_PROJECT, ASSOCIATE_LOCAL_DIRECTORY } from "./constants";
import ICommand from "./ICommand";
import registerCommand from "./register";
import { ControllerNodeApi } from "./StartDevModeCommand";
import { getContainer } from "../utils/getContainer";
import { INhCtlGetResult } from "../domain";

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

    const kubeConfigPath = node.getKubeConfigPath();
    const namespace = node.getNameSpace();
    const appName = node.getAppName();

    const containerName =
      (await node.getContainer()) ||
      (await getContainer({
        appName: appName,
        name: node.name,
        resourceType: node.resourceType,
        namespace: namespace,
        kubeConfigPath,
      }));

    const profile = await associateInfo(
      kubeConfigPath,
      namespace,
      appName,
      node.resourceType,
      node.name,
      containerName
    );

    if (profile) {
      if (!existsSync(profile)) {
        vscode.commands.executeCommand(ASSOCIATE_LOCAL_DIRECTORY, node, true);
        return;
      }
      const currentUri = host.getCurrentRootPath();

      const uri = vscode.Uri.file(profile);

      if (currentUri !== uri.fsPath) {
        vscode.commands.executeCommand("vscode.openFolder", uri, true);
      }
    } else {
      vscode.commands.executeCommand(
        ASSOCIATE_LOCAL_DIRECTORY,
        node,
        containerName
      );
    }
  }
}
