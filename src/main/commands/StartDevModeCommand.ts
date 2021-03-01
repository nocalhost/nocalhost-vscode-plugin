import * as vscode from "vscode";
import * as os from "os";

import ICommand from "./ICommand";
import { EXEC, START_DEV_MODE, SYNC_SERVICE } from "./constants";
import registerCommand from "./register";
import {
  TMP_APP,
  TMP_CONTAINER,
  TMP_DEVSTART_APPEND_COMMAND,
  TMP_ID,
  TMP_KUBECONFIG_PATH,
  TMP_RESOURCE_TYPE,
  TMP_STATUS,
  TMP_STORAGE_CLASS,
  TMP_WORKLOAD,
  TMP_WORKLOAD_PATH,
} from "../constants";
import host, { Host } from "../host";
import * as path from "path";
import git from "../ctl/git";
import ConfigService from "../service/configService";
import * as nhctl from "../ctl/nhctl";
import * as kubectl from "../ctl/kubectl";
import * as nls from "../../../package.nls.json";
import { DeploymentStatus } from "../nodes/types/nodeType";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import { appTreeView } from "../extension";

export interface ControllerNodeApi {
  name: string;
  resourceType: string;
  setStatus: (status: string) => Promise<void>;
  getStatus: () => Promise<string> | string;
  setContainer: (container: string) => Promise<void>;
  getContainer: () => Promise<string>;
  getKubeConfigPath: () => string;
  getAppName: () => string;
  getStorageClass: () => string | undefined;
  getDevStartAppendCommand: () => string | undefined;
}

export default class StartDevModeCommand implements ICommand {
  command: string = START_DEV_MODE;
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    registerCommand(context, this.command, true, this.execCommand.bind(this));
  }
  async execCommand(node: ControllerNodeApi) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    if (node instanceof ControllerResourceNode && appTreeView) {
      await appTreeView.reveal(node, { select: true, focus: true });
    }
    const result = await this.getPodAndContainer(node);
    if (!result) {
      return;
    }
    const appName = node.getAppName();
    const destDir = await this.cloneOrGetFolderDir(
      appName,
      node,
      result.containerName
    );
    if (
      destDir === true ||
      (destDir && destDir === this.getCurrentRootPath())
    ) {
      host.disposeBookInfo();
      await this.startDevMode(host, appName, node, result.containerName);
    } else if (destDir) {
      host.disposeBookInfo();
      this.saveAndOpenFolder(appName, node, destDir, result.containerName);
    }
  }

  private saveAndOpenFolder(
    appName: string,
    node: ControllerNodeApi,
    destDir: string,
    containerName: string
  ) {
    let appConfig = host.getGlobalState(appName) || {};
    let workloadConfig = appConfig[node.name] || {};
    let containerConfig = workloadConfig[containerName] || {};
    const currentUri = this.getCurrentRootPath();
    containerConfig.directory = destDir;
    workloadConfig[containerName] = containerConfig;
    appConfig[node.name] = workloadConfig;
    host.setGlobalState(appName, appConfig);
    const uri = vscode.Uri.file(destDir);
    if (currentUri !== uri.fsPath) {
      vscode.commands.executeCommand("vscode.openFolder", uri, true);
      this.setTmpStartRecord(
        appName,
        uri.fsPath,
        node as ControllerResourceNode,
        containerName
      );
    }
  }

  private async cloneCode(
    host: Host,
    appName: string,
    workloadName: string,
    containerName: string
  ) {
    let destDir: string | undefined;
    let gitUrl: string | undefined = await this.getGitUrl(
      appName,
      workloadName,
      containerName
    );
    if (!gitUrl) {
      gitUrl = await host.showInputBox({
        placeHolder: "please input your git url",
      });
    }
    if (gitUrl) {
      const saveUris = await host.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: "select save directory",
      });
      if (saveUris && saveUris.length > 0) {
        destDir = path.resolve(saveUris[0].fsPath, workloadName);
        await host.showProgressing("Starting DevMode", async (progress) => {
          progress.report({
            message: "cloning code",
          });
          await git.clone(host, gitUrl as string, [destDir as string]);
        });
      }
    }
    return destDir;
  }

  private async firstOpen(
    appName: string,
    node: ControllerNodeApi,
    containerName: string
  ) {
    let destDir: string | undefined;
    const result = await host.showInformationMessage(
      nls["tips.clone"],
      { modal: true },
      nls["bt.clone"],
      nls["bt.open.dir"]
    );
    if (!result) {
      return;
    }
    if (result === nls["bt.clone"]) {
      destDir = await this.cloneCode(host, appName, node.name, containerName);
    } else if (result === nls["bt.open.dir"]) {
      const uris = await host.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
      });
      if (uris && uris.length > 0) {
        destDir = uris[0].fsPath;
      }
    }

    return destDir;
  }

  private async getTargetDirectory(
    appName: string,
    node: ControllerNodeApi,
    containerName: string
  ) {
    let destDir: string | undefined;
    let appConfig = host.getGlobalState(appName);
    let workloadConfig = appConfig[node.name];
    let containerConfig = workloadConfig[containerName] || {};

    const result = await host.showInformationMessage(
      nls["tips.open"],
      { modal: true },
      nls["bt.open.other"],
      nls["bt.open.dir"]
    );
    if (result === nls["bt.open.other"]) {
      const uris = await host.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
      });
      if (uris && uris.length > 0) {
        destDir = uris[0].fsPath;
      }
    } else if (result === nls["bt.open.dir"]) {
      destDir = containerConfig.directory;
    }

    return destDir;
  }

  private async cloneOrGetFolderDir(
    appName: string,
    node: ControllerNodeApi,
    containerName: string
  ) {
    let destDir: string | undefined | boolean;
    let appConfig = host.getGlobalState(appName) || {};
    const currentUri = this.getCurrentRootPath();
    let workloadConfig = appConfig[node.name] || {};
    let containerConfig = workloadConfig[containerName] || {};
    workloadConfig[containerName] = containerConfig;
    appConfig[node.name] = workloadConfig;
    host.setGlobalState(appName, appConfig);
    if (!containerConfig.directory) {
      destDir = await this.firstOpen(appName, node, containerName);
    } else if (currentUri !== containerConfig.directory) {
      destDir = await this.getTargetDirectory(appName, node, containerName);
    } else {
      destDir = true;
    }

    if (destDir && destDir !== true) {
      containerConfig.directory = destDir;
      host.setGlobalState(appName, appConfig);
    }

    return destDir;
  }

  async startDevMode(
    host: Host,
    appName: string,
    node: ControllerNodeApi,
    containerName: string
  ) {
    const currentUri = this.getCurrentRootPath() || os.homedir();

    await vscode.window.withProgress(
      {
        title: "Starting DevMode",
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
      },
      async (progress) => {
        try {
          await node.setStatus(DeploymentStatus.starting);
          host.getOutputChannel().show(true);
          progress.report({
            message: "dev start",
          });
          host.log("dev start ...", true);
          let dirs: Array<string> | string = new Array<string>();
          let isOld = false;
          dirs = host.formalizePath(currentUri);
          // update deployment label
          node.setContainer(containerName);
          await nhctl.devStart(
            host,
            node.getKubeConfigPath(),
            appName,
            node.name,
            {
              isOld: isOld,
              dirs: dirs,
            },
            containerName,
            node.getStorageClass(),
            node.getDevStartAppendCommand()
          );
          host.log("dev start end", true);
          host.log("", true);

          progress.report({
            message: "syncing file",
          });
          host.log("sync file ...", true);
          await nhctl.syncFile(
            host,
            node.getKubeConfigPath(),
            appName,
            node.name
          );
          host.log("sync file end", true);
          host.log("", true);
          const container = await ConfigService.getContaienrConfig(
            appName,
            node.name,
            containerName
          );
          if (
            container &&
            container.dev.portForward &&
            container.dev.portForward.length &&
            container.dev.portForward.length > 0
          ) {
            progress.report({
              message: "port forwarding",
            });
            host.log("port forward ...", true);
            await nhctl
              .startPortForward(
                host,
                node.getKubeConfigPath(),
                appName,
                node.name,
                "devPorts",
                node.resourceType,
                container.dev.portForward
              )
              .catch(() => {});
            host.log("port forward end", true);
            host.log("", true);
          }

          progress.report({
            message: "DevMode Started.",
          });
          node.setStatus("");
          await vscode.commands.executeCommand(EXEC, node);
        } catch (error) {
          node.setStatus("");
        }
      }
    );

    vscode.commands.executeCommand(SYNC_SERVICE, {
      app: appName,
      service: node.name,
    });
  }

  private getCurrentRootPath() {
    return (
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0 &&
      vscode.workspace.workspaceFolders[0].uri.fsPath
    );
  }

  private setTmpStartRecord(
    appName: string,
    workloadPath: string,
    node: ControllerResourceNode,
    containerName: string
  ) {
    const appNode = node.getAppNode();
    host.setGlobalState(TMP_ID, node.getNodeStateId());
    host.setGlobalState(TMP_APP, appName);
    host.setGlobalState(TMP_WORKLOAD, node.name);
    host.setGlobalState(TMP_STATUS, `${node.getNodeStateId()}_status`);
    host.setGlobalState(TMP_RESOURCE_TYPE, node.resourceType);
    host.setGlobalState(TMP_KUBECONFIG_PATH, appNode.getKubeConfigPath());
    host.setGlobalState(TMP_WORKLOAD_PATH, workloadPath);
    host.setGlobalState(TMP_CONTAINER, containerName);
    const storageClass = node.getStorageClass();
    if (storageClass) {
      host.setGlobalState(TMP_STORAGE_CLASS, storageClass);
    }

    const devStartAppendCommand = node.getDevStartAppendCommand();
    if (devStartAppendCommand) {
      host.setGlobalState(TMP_DEVSTART_APPEND_COMMAND, devStartAppendCommand);
    }
  }

  private async getSvcConfig(appName: string, workloadName: string) {
    let workloadConfig = await ConfigService.getWorkloadConfig(
      appName,
      workloadName
    );

    return workloadConfig;
  }

  private async getGitUrl(
    appName: string,
    workloadName: string,
    containerName: string
  ) {
    const config = await ConfigService.getContaienrConfig(
      appName,
      workloadName,
      containerName
    );
    let gitUrl = "";
    if (config) {
      gitUrl = config.dev.gitUrl;
    }

    return gitUrl;
  }

  async getPodAndContainer(node: ControllerNodeApi) {
    const kubeConfigPath = node.getKubeConfigPath();
    let podName: string | undefined;
    const podNameArr = await kubectl.getPodNames(
      node.name,
      node.resourceType,
      kubeConfigPath
    );
    podName = podNameArr[0];
    if (!podName) {
      return;
    }
    let containerName: string | undefined = (await node.getContainer()) || "";

    if (!containerName) {
      const containerNameArr = await kubectl.getContainerNames(
        podName,
        kubeConfigPath
      );

      if (containerNameArr.length > 1) {
        containerName = await vscode.window.showQuickPick(containerNameArr);
        if (!containerName) {
          return;
        }
      }
    }

    return { containerName, podName };
  }
}
