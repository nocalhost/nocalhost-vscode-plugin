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

export interface ControllerNodeApi {
  name: string;
  resourceType: string;
  setStatus: (status: string, refresh?: boolean) => Promise<void>;
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
    const appName = node.getAppName();
    await this.startDevMode(host, appName, node);
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
      if (saveUris) {
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

  async startDevMode(host: Host, appName: string, node: ControllerNodeApi) {
    let appConfig = fileStore.get(appName) || {};
    const currentUri = vscode.workspace.rootPath;
    let workloadConfig = appConfig[node.name] || {};
    appConfig[node.name] = workloadConfig;
    fileStore.set(appName, appConfig);
    let destDir;
    if (!workloadConfig.directory) {
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
        if (destDir) {
          workloadConfig.directory = destDir;
          appConfig[node.name] = workloadConfig;
          fileStore.set(appName, appConfig);
          const uri = vscode.Uri.file(destDir);
          if (currentUri !== uri.fsPath) {
            vscode.commands.executeCommand("vscode.openFolder", uri, true);
            this.setTmpStartRecord(appName, node as ControllerResourceNode);
            return;
          }
        }
      } else if (result === nls["bt.open.dir"]) {
        const uris = await host.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
        });
        if (uris) {
          workloadConfig.directory = uris[0].fsPath;
          fileStore.set(appName, appConfig);
          if (currentUri !== uris[0].fsPath) {
            vscode.commands.executeCommand("vscode.openFolder", uris[0], true);
            this.setTmpStartRecord(appName, node as ControllerResourceNode);
            return;
          }
        }
      }
    }
    // fresh config
    appConfig = fileStore.get(appName);
    workloadConfig = appConfig[node.name];
    if (currentUri !== workloadConfig.directory) {
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
        if (uris) {
          workloadConfig["directory"] = uris[0].fsPath;
          fileStore.set(appName, appConfig);
          vscode.commands.executeCommand("vscode.openFolder", uris[0], true);
          this.setTmpStartRecord(appName, node as ControllerResourceNode);
          return;
        }
      } else if (result === nls["bt.open.dir"]) {
        const uri = vscode.Uri.file(workloadConfig.directory);
        vscode.commands.executeCommand("vscode.openFolder", uri, true);
        this.setTmpStartRecord(appName, node as ControllerResourceNode);
        return;
      }
    }

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
            dirs = svc.syncDirs.map((item) =>
              path.resolve(workloadConfig.directory || os.homedir(), item)
            );
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

          progress.report({
            message: "port forwarding",
          });
          host.log("port forward ...", true);
          await nhctl.startPortForward(
            host,
            node.getKubeConfigPath(),
            appName,
            node.name
          );
          host.log("port forward end", true);
          host.log("", true);

          setTimeout(() => {
            nhctl.printAppInfo(host, node.getKubeConfigPath(), appName);
          }, 10 * 1000);

          progress.report({
            message: "DevMode Started.",
          });

          if (node instanceof ControllerResourceNode) {
            await node.setStatus("", true);
          } else {
            await node.setStatus(DeploymentStatus.developing);
          }

          vscode.commands.executeCommand(EXEC, node);
        } catch (error) {
          node.setStatus("", true);
        }
      }
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
