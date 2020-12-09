import * as nhctl from "../ctl/nhctl";
import * as kubectl from "../ctl/kubectl";
import git from "../ctl/git";
import { Host } from "../host";
import * as path from "path";
import * as os from "os";

import * as vscode from "vscode";

import { updateAppInstallStatus } from "../api";
import { PodResource, Resource } from "../nodes/resourceType";
import {
  CURRENT_KUBECONFIG_FULLPATH,
  HELM_VALUES_DIR,
  NHCTL_DIR,
  SELECTED_APP_NAME,
  TMP_APP,
  TMP_RESOURCE_TYPE,
  TMP_STATUS,
  TMP_WORKLOAD,
} from "../constants";
import * as fileStore from "../store/fileStore";
import ConfigService, { NocalhostServiceConfig } from "./configService";

import * as nls from "../../../package.nls.json";
import { ControllerResourceNode, DeploymentStatus } from "../nodes/nodeType";
import state from "../state";

export interface ControllerNodeApi {
  name: string;
  resourceType: string;
  setStatus: (status: string, refresh?: boolean) => Promise<void>;
  getStatus: () => Promise<string> | string;
}

class NocalhostService {
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

  async install(
    host: Host,
    appName: string,
    appId: number,
    devSpaceId: number,
    gitUrl: string,
    installType: string,
    resourceDir: string
  ) {
    host.log(`Installing application: ${appName}`, true);
    host.showInformationMessage(`Installing application: ${appName}`);
    // tips
    let values: string | undefined;
    if (["helm", "helm-repo"].includes(installType)) {
      const res = await host.showInformationMessage(
        "Do you want to specify a values.yaml?",
        { modal: true },
        "Specify One",
        "Use Default values"
      );
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
    await nhctl.install(
      host,
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

  async log(host: Host, appId: number, type: string, workloadName: string) {
    const resArr = await kubectl.getControllerPod(host, type, workloadName);
    if (resArr && resArr.length <= 0) {
      host.showErrorMessage("Not found pod");
      return;
    }
    const podNameArr = (resArr as Array<Resource>).map((res) => {
      return res.metadata.name;
    });
    let podName: string | undefined = podNameArr[0];
    if (podNameArr.length > 1) {
      podName = await vscode.window.showQuickPick(podNameArr);
    }
    if (!podName) {
      return;
    }
    const podStr = await kubectl.loadResource(host, "pod", podName, "json");
    const pod = JSON.parse(podStr as string) as PodResource;
    const containerNameArr = pod.spec.containers.map((c) => {
      return c.name;
    });
    let containerName: string | undefined = containerNameArr[0];
    if (containerNameArr.length > 1) {
      containerName = await vscode.window.showQuickPick(containerNameArr);
    }
    if (!containerName) {
      return;
    }

    const uri = vscode.Uri.parse(
      `Nocalhost://k8s/log/${podName}/${containerName}`
    );
    let doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, { preview: false });
  }

  async uninstall(
    host: Host,
    appName: string,
    appId: number,
    devSpaceId: number
  ) {
    host.log(`Uninstalling application: ${appName}`, true);
    host.showInformationMessage(`Uninstalling application: ${appName}`);
    await nhctl.uninstall(host, appName);
    await updateAppInstallStatus(appId, devSpaceId, 0);
    fileStore.remove(appName);
    state.delete(appName);
    host.log(`Application ${appName} uninstalled`, true);
    host.showInformationMessage(`Application ${appName} uninstalled`);
  }

  delay(second: number) {
    return new Promise((res, rej) => {
      setTimeout(() => {
        res();
      }, second * 1000);
    });
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
        await git.clone(host, gitUrl, [destDir]);
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
          const svc = await this.getSvcConfig(node.name);
          let dirs = new Array<string>();
          if (svc && svc.syncDirs) {
            dirs = svc.syncDirs.map((item) =>
              path.resolve(workloadConfig.directory || os.homedir(), item)
            );
          }
          await nhctl.devStart(host, appName, node.name, dirs);
          host.log("dev start end", true);
          host.log("", true);

          progress.report({
            message: "syncing file",
          });
          host.log("sync file ...", true);
          await nhctl.syncFile(host, appName, node.name);
          host.log("sync file end", true);
          host.log("", true);

          progress.report({
            message: "port forwarding",
          });
          host.log("port forward ...", true);
          await nhctl.startPortForward(host, appName, node.name);
          host.log("port forward end", true);
          host.log("", true);

          setTimeout(() => {
            nhctl.printAppInfo(host, appName);
          }, 10 * 1000);

          progress.report({
            message: "DevMode Started.",
          });

          if (node instanceof ControllerResourceNode) {
            await node.setStatus("", true);
          } else {
            await node.setStatus(DeploymentStatus.developing);
          }

          await this.exec(host, node);
        } catch (error) {
          node.setStatus("", true);
        }
      }
    );
  }

  private setTmpStartRecord(appName: string, node: ControllerResourceNode) {
    fileStore.set(TMP_APP, appName);
    fileStore.set(TMP_WORKLOAD, node.name);
    fileStore.set(TMP_STATUS, `${node.getNodeStateId()}_status`);
    fileStore.set(TMP_RESOURCE_TYPE, node.resourceType);
  }

  private async getSvcConfig(workloadName: string) {
    const appName = fileStore.get(SELECTED_APP_NAME);
    let workloadConfig = await ConfigService.getWorkloadConfig(
      appName,
      workloadName
    );

    return workloadConfig;
  }

  async endDevMode(host: Host, appName: string, node: ControllerResourceNode) {
    host.getOutputChannel().show(true);
    host.showInformationMessage("Ending DevMode.");
    host.log("Ending DevMode ...", true);
    await nhctl.endDevMode(host, appName, node.name);
    await node.setStatus("", true);
    host.showInformationMessage("DevMode Ended.");
    host.log("DevMode Ended", true);
  }

  async exec(host: Host, node: ControllerNodeApi) {
    const status = await node.getStatus();
    if (status === DeploymentStatus.developing) {
      await this.opendevSpaceExec(host, node.resourceType, node.name);
    } else {
      await this.openExec(host, node.resourceType, node.name);
    }
  }

  async opendevSpaceExec(host: Host, type: string, workloadName: string) {
    const resArr = await kubectl.getControllerPod(host, type, workloadName);
    if (resArr && resArr.length <= 0) {
      host.showErrorMessage("Not found pod");
      return;
    }
    const podName = (resArr as Array<Resource>)[0].metadata.name;
    const kubeconfigPath = fileStore.get(CURRENT_KUBECONFIG_FULLPATH);
    const command = `kubectl exec -it ${podName} -c nocalhost-dev --kubeconfig ${kubeconfigPath} -- /bin/sh`;
    const terminalDisposed = host.invokeInNewTerminal(command, podName);
    host.pushDebugDispose(terminalDisposed);
    host.showInformationMessage("DevSpace terminal Opened");
    host.log("", true);
  }

  /**
   * exec
   * @param host
   * @param type
   * @param workloadName
   */
  async openExec(host: Host, type: string, workloadName: string) {
    host.log("open container ...", true);
    host.showInformationMessage("open container ...");
    const resArr = await kubectl.getControllerPod(host, type, workloadName);
    if (resArr && resArr.length <= 0) {
      host.showErrorMessage("Not found pod");
      return;
    }
    const podNameArr = (resArr as Array<Resource>).map((res) => {
      return res.metadata.name;
    });
    let podName: string | undefined = podNameArr[0];
    if (podNameArr.length > 1) {
      podName = await vscode.window.showQuickPick(podNameArr);
    }
    if (!podName) {
      return;
    }
    const podStr = await kubectl.loadResource(host, "pod", podName, "json");
    const pod = JSON.parse(podStr as string) as PodResource;
    const containerNameArr = pod.spec.containers.map((c) => {
      return c.name;
    });
    let containerName: string | undefined = containerNameArr[0];
    if (containerNameArr.length > 1) {
      containerName = await vscode.window.showQuickPick(containerNameArr);
    }
    if (!containerName) {
      return;
    }
    const kubeconfigPath = fileStore.get(CURRENT_KUBECONFIG_FULLPATH);
    const command = `kubectl exec -it ${podName} -c ${containerName} --kubeconfig ${kubeconfigPath} -- /bin/sh`;
    const terminalDisposed = host.invokeInNewTerminal(command, podName);
    host.pushDebugDispose(terminalDisposed);
    host.log("open container end", true);
    host.log("", true);
  }

  async portForward(host: Host, type: string, workloadName: string) {
    const resArr = await kubectl.getControllerPod(host, type, workloadName);
    if (resArr && resArr.length <= 0) {
      host.showErrorMessage("Not found pod");
      return;
    }
    const podNameArr = (resArr as Array<Resource>).map((res) => {
      return res.metadata.name;
    });
    let podName: string | undefined = podNameArr[0];
    if (podNameArr.length > 1) {
      podName = await vscode.window.showQuickPick(podNameArr);
    }
    if (!podName) {
      return;
    }
    let portMap: string | undefined = "";
    portMap = await vscode.window.showInputBox({
      placeHolder: "eg: 1234:1234",
    });
    if (!portMap) {
      return;
    }
    // kubeconfig
    const kubeconfigPath = fileStore.get(CURRENT_KUBECONFIG_FULLPATH);
    const command = `kubectl port-forward ${podName} ${portMap} --kubeconfig ${kubeconfigPath}`;
    const terminalDisposed = host.invokeInNewTerminal(command);
    host.pushDebugDispose(terminalDisposed);
    host.log("open container end", true);
    host.log("", true);
  }
}

export default new NocalhostService();
