import * as vscode from "vscode";
import * as os from "os";

import ICommand from "./ICommand";
import { ASSOCIATE_LOCAL_DIRECTORY } from "./constants";
import registerCommand from "./register";
import { IWorkloadConfig } from "../domain/IWorkloadConfig";
import { Deployment } from "../nodes/workloads/controllerResources/deployment/Deployment";
import host from "../host";
import { associate, getServiceConfig } from "../ctl/nhctl";

import * as kubectl from "../ctl/kubectl";

export default class AssociateLocalDirectoryCommand implements ICommand {
  command: string = ASSOCIATE_LOCAL_DIRECTORY;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: Deployment) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    let appName: string, workloadName: string | undefined;
    appName = node.getAppName();
    workloadName = node.name;
    const namespace = node.getNameSpace();
    const kubeConfigPath = node.getKubeConfigPath();

    const status = await node.getStatus();
    if (status === "developing") {
      host.showWarnMessage("after exiting develop mode, please try again!");
      return;
    }
    // const result = await this.getPodAndContainer(node);
    // if (!result) {
    //   return;
    // }
    const profile = await getServiceConfig(
      node.getKubeConfigPath(),
      node.getNameSpace(),
      node.getAppName(),
      node.name,
      node.resourceType
    );

    let appConfig = host.getGlobalState(appName) || {};
    let workloadConfig: IWorkloadConfig = appConfig[node.name] || {};
    workloadConfig.directory = profile.associate;

    const currentUri = this.getCurrentRootPath();
    let destDir = workloadConfig.directory;
    const selectUri = await host.showSelectFolderDialog(
      "Associate local directory",
      vscode.Uri.file(destDir || currentUri || os.homedir())
    );
    if (selectUri && selectUri.length > 0) {
      workloadConfig.directory = selectUri[0].fsPath;
      appConfig[node.name] = workloadConfig;
      await associate(
        kubeConfigPath,
        namespace,
        appName,
        workloadConfig.directory,
        node.resourceType,
        workloadName
      );
      host.setGlobalState(appName, appConfig);
      host.showInformationMessage("Directory successfully linked");
    }
  }

  private getCurrentRootPath() {
    return (
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0 &&
      vscode.workspace.workspaceFolders[0].uri.fsPath
    );
  }

  async getPodAndContainer(node: Deployment) {
    const kubeConfigPath = node.getKubeConfigPath();
    let podName: string | undefined;
    const appNode = node.getAppNode();
    const podNameArr = await kubectl.getPodNames(
      node.name,
      node.resourceType,
      appNode.namespace,
      kubeConfigPath
    );
    podName = podNameArr[0];
    if (!podName) {
      return;
    }
    const containerNameArr = await kubectl.getContainerNames(
      podName,
      kubeConfigPath,
      appNode.namespace
    );
    let containerName: string | undefined = "";
    if (containerNameArr.length === 1) {
      containerName = containerNameArr[0];
    }
    if (containerNameArr.length > 1) {
      containerName = await vscode.window.showQuickPick(containerNameArr);
      if (!containerName) {
        return;
      }
    }

    return { containerName, podName };
  }
}
