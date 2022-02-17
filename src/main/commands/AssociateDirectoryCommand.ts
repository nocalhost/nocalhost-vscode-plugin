import vscode from "vscode";
import os from "os";

import ICommand from "./ICommand";
import { ASSOCIATE_LOCAL_DIRECTORY } from "./constants";
import registerCommand from "./register";
import { Deployment } from "../nodes/workloads/controllerResources/deployment/Deployment";
import host from "../host";
import { associate, getServiceConfig, NhctlCommand } from "../ctl/nhctl";
import { getContainer } from "../utils/getContainer";
import SyncServiceCommand from "./sync/SyncServiceCommand";

export default class AssociateLocalDirectoryCommand implements ICommand {
  command: string = ASSOCIATE_LOCAL_DIRECTORY;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: Deployment, container?: string) {
    if (!node) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }
    let appName: string, workloadName: string | undefined;
    appName = node.getAppName();
    workloadName = node.name;
    const namespace = node.getNameSpace();
    const kubeConfigPath = node.getKubeConfigPath();

    const status = await node.getStatus();
    /*
     * https://nocalhost.coding.net/p/nocalhost/bug-tracking/issues/615/detail
     */
    const devModeType = node?.svcProfile?.devModeType;
    const possess = node?.svcProfile?.possess;

    if (
      !(devModeType !== "duplicate" && possess === false) &&
      status === "developing" &&
      !container
    ) {
      host.showWarnMessage(
        "You are already in DevMode, please exit and try again"
      );
      return;
    }

    const profile = await getServiceConfig(
      node.getKubeConfigPath(),
      node.getNameSpace(),
      node.getAppName(),
      node.name,
      node.resourceType
    );

    const containerName =
      container ||
      (await node.getContainer()) ||
      (await getContainer({
        appName: node.getAppName(),
        name: node.name,
        resourceType: node.resourceType.toLocaleLowerCase(),
        namespace: node.getNameSpace(),
        kubeConfigPath: node.getKubeConfigPath(),
      }));

    const currentUri = host.getCurrentRootPath();

    const selectUri = await host.showSelectFolderDialog(
      "Associate local directory",
      vscode.Uri.file(profile.associate || currentUri || os.homedir())
    );
    if (selectUri && selectUri.length > 0) {
      await associate(
        kubeConfigPath,
        namespace,
        appName,
        selectUri[0].fsPath,
        node.resourceType,
        workloadName,
        containerName
      );

      if (host.getCurrentRootPath() === selectUri[0].fsPath) {
        SyncServiceCommand.checkSync();
      }

      if (container) {
        vscode.commands.executeCommand("vscode.openFolder", selectUri[0], true);
      } else {
        host.showInformationMessage("Directory successfully linked");
      }
    }
  }
}
