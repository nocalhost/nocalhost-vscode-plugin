import * as vscode from "vscode";
import * as os from "os";

import ICommand from "./ICommand";
import * as fileStore from "../store/fileStore";
import { EXEC, START_DEV_MODE } from "./constants";
import registerCommand from "./register";
import {
  TMP_APP,
  TMP_KUBECONFIG_PATH,
  TMP_RESOURCE_TYPE,
  TMP_STATUS,
  TMP_WORKLOAD,
} from "../constants";
import host, { Host } from "../host";
import * as path from "path";
import git from "../ctl/git";
import ConfigService from "../service/configService";
import * as nhctl from "../ctl/nhctl";
import * as nls from "../../../package.nls.json";
import { DeploymentStatus } from "../nodes/types/nodeType";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import state from "../state";
import { appTreeView } from "../extension";

export interface ControllerNodeApi {
  name: string;
  resourceType: string;
  setStatus: (status: string) => Promise<void>;
  getStatus: () => Promise<string> | string;
  getKubeConfigPath: () => string;
  getAppName: () => string;
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
    const appName = node.getAppName();
    const destDir = await this.cloneOrGetFolderDir(appName, node);
    if (
      destDir === true ||
      (destDir && destDir === this.getCurrentRootPath())
    ) {
      host.disposeBookInfo();
      await this.startDevMode(host, appName, node);
    } else if (destDir) {
      host.disposeBookInfo();
      this.saveAndOpenFolder(appName, node, destDir);
    }
  }

  private saveAndOpenFolder(
    appName: string,
    node: ControllerNodeApi,
    destDir: string
  ) {
    let appConfig = fileStore.get(appName) || {};
    let workloadConfig = appConfig[node.name] || {};
    const currentUri = this.getCurrentRootPath();
    workloadConfig.directory = destDir;
    appConfig[node.name] = workloadConfig;
    fileStore.set(appName, appConfig);
    const uri = vscode.Uri.file(destDir);
    if (currentUri !== uri.fsPath) {
      vscode.commands.executeCommand("vscode.openFolder", uri, true);
      this.setTmpStartRecord(appName, node as ControllerResourceNode);
    }
  }

  private async cloneCode(host: Host, appName: string, workloadName: string) {
    let destDir: string | undefined;
    let gitUrl = await this.getGitUrl(appName, workloadName);
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
        await host.showProgressing(async (progress) => {
          progress.report({
            message: "cloning code",
          });
          await git.clone(host, gitUrl as string, [destDir as string]);
        });
      }
    }
    return destDir;
  }

  private async firstOpen(appName: string, node: ControllerNodeApi) {
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
      destDir = await this.cloneCode(host, appName, node.name);
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

  private async getTargetDirectory(appName: string, node: ControllerNodeApi) {
    let destDir: string | undefined;
    let appConfig = fileStore.get(appName);
    let workloadConfig = appConfig[node.name];

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
      destDir = workloadConfig.directory;
    }

    return destDir;
  }

  private async cloneOrGetFolderDir(appName: string, node: ControllerNodeApi) {
    let destDir: string | undefined | boolean;
    let appConfig = fileStore.get(appName) || {};
    const currentUri = this.getCurrentRootPath();
    let workloadConfig = appConfig[node.name] || {};
    appConfig[node.name] = workloadConfig;
    fileStore.set(appName, appConfig);
    if (!workloadConfig.directory) {
      destDir = await this.firstOpen(appName, node);
    } else if (currentUri !== workloadConfig.directory) {
      destDir = await this.getTargetDirectory(appName, node);
    } else {
      destDir = true;
    }

    return destDir;
  }

  async startDevMode(host: Host, appName: string, node: ControllerNodeApi) {
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
          const svc = await this.getSvcConfig(appName, node.name);
          let dirs = new Array<string>();
          if (svc && svc.syncDirs) {
            dirs = svc.syncDirs.map((item) => path.resolve(currentUri, item));
          }
          await nhctl.devStart(
            host,
            node.getKubeConfigPath(),
            appName,
            node.name,
            dirs
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

          if (
            svc &&
            svc.devPorts &&
            svc.devPorts.length &&
            svc.devPorts.length > 0
          ) {
            progress.report({
              message: "port forwarding",
            });
            host.log("port forward ...", true);
            await nhctl.startPortForward(
              host,
              node.getKubeConfigPath(),
              appName,
              node.name,
              svc.devPorts
            );
            host.log("port forward end", true);
            host.log("", true);
          }

          setTimeout(() => {
            nhctl.printAppInfo(host, node.getKubeConfigPath(), appName);
          }, 10 * 1000);

          progress.report({
            message: "DevMode Started.",
          });

          if (node instanceof ControllerResourceNode) {
            await node.setStatus("");
          } else {
            await node.setStatus(DeploymentStatus.developing);
          }

          await vscode.commands.executeCommand(EXEC, node);
        } catch (error) {
          node.setStatus("");
        }
      }
    );
  }

  private getCurrentRootPath() {
    return (
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0 &&
      vscode.workspace.workspaceFolders[0].uri.fsPath
    );
  }

  private setTmpStartRecord(appName: string, node: ControllerResourceNode) {
    const appNode = node.getAppNode();
    fileStore.set(TMP_APP, appName);
    fileStore.set(TMP_WORKLOAD, node.name);
    fileStore.set(TMP_STATUS, `${node.getNodeStateId()}_status`);
    fileStore.set(TMP_RESOURCE_TYPE, node.resourceType);
    fileStore.set(TMP_KUBECONFIG_PATH, appNode.getKUbeconfigPath());
  }

  private async getSvcConfig(appName: string, workloadName: string) {
    let workloadConfig = await ConfigService.getWorkloadConfig(
      appName,
      workloadName
    );

    return workloadConfig;
  }

  private async getGitUrl(appName: string, workloadName: string) {
    const config = await ConfigService.getAppConfig(appName);
    const arr = config.services;
    for (let i = 0; i < arr.length; i++) {
      const { gitUrl, name } = arr[i];
      if (name === workloadName) {
        return gitUrl;
      }
    }
  }
}
