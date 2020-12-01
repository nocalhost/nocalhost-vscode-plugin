import * as nhctl from "../ctl/nhctl";
import * as kubectl from "../ctl/kubectl";
import git from "../ctl/git";
import { Host } from "../host";
import * as fileUtil from "../utils/fileUtil";
import * as path from "path";
import * as os from "os";

import * as vscode from "vscode";

import { updateAppInstallStatus } from "../api";
import { PodResource, Resource } from "../nodes/resourceType";
import { CURRENT_KUBECONFIG_FULLPATH, SELECTED_APP_NAME } from "../constants";
import * as fileStore from "../store/fileStore";

import * as nls from "../../../package.nls.json";
import { ControllerResourceNode, DeploymentStatus } from "../nodes/nodeType";
interface NocalhostConfig {
  preInstalls: Array<{
    path: string;
    weight?: string | number;
  }>;
  appConfig: {
    name: string;
    type: string;
    resourcePath: string;
  };
  svcConfigs: Array<{
    name: string;
    type: string;
    gitUrl: string;
    devLang: string; // # java|go|node|php
    devImage: string;
    workDir: string;
    localWorkDir: string;
    sync: Array<string>;
    ignore: Array<string>;
    sshPort: {
      localPort: number;
      sshPort: number;
    };
    devPort: Array<string>;
    command: Array<string>;
    jobs: Array<string>;
    pods: Array<string>;
  }>;
}

interface JobConfig {
  name: string;
  path: string;
  priority?: number;
}

interface NocalhostServiceConfig {
  name?: string;
  nameRegex?: string;
  type: string;
  gitUrl: string;
  devContainerImage: string;
  devContainerShell?: string;
  syncType?: string;
  syncDirs?: Array<string>; // default ["."]
  ignoreDirs?: Array<string>;
  devPort?: Array<string>;
  dependPodsLabelSelector?: Array<string>;
  dependJobsLabelSelector?: Array<string>;
  workDir?: string; // default value: "/home/nocalhost-dev"
  persistentVolumeDir?: string;
  buildCommand?: string;
  runCommand?: string;
  debugCommand?: string;
  hotReloadRunCommand?: string;
  hotReloadDebugCommand?: string;
  remoteDebugPort?: number;
}

interface NewNocalhostConfig {
  name: string; // uniq
  manifestType: string; // helm
  resourcePath: Array<string>; // default: ["."]
  minimalInstall: boolean;
  onPreInstall?: Array<JobConfig>;
  onPostInstall?: Array<JobConfig>;
  onPreUninstall?: Array<JobConfig>;
  onPostUninstall?: Array<JobConfig>;
  services: Array<NocalhostServiceConfig>;
}

const NHCTL_DIR = path.resolve(os.homedir(), ".nhctl");

class NocalhostService {
  private async getGitUrl(appName: string, workloadName: string) {
    const config = await this.getAppConfig(appName);
    const arr = config.svcConfigs;
    for (let i = 0; i < arr.length; i++) {
      const { gitUrl, name } = arr[i];
      if (name === workloadName) {
        return gitUrl;
      }
    }
  }

  private async getAppConfig(appName: string) {
    const configPath = path.resolve(
      NHCTL_DIR,
      "application",
      appName,
      ".nocalhost",
      "config.yaml"
    );
    const config = (await fileUtil.readYaml(configPath)) as NocalhostConfig;

    return config;
  }

  private async writeConfig(appName: string, config: NocalhostConfig) {
    const configPath = path.resolve(
      NHCTL_DIR,
      "application",
      appName,
      ".nocalhost",
      "config.yaml"
    );
    await fileUtil.writeYaml(configPath, config);
  }

  async install(
    host: Host,
    appName: string,
    appId: number,
    devSpaceId: number,
    gitUrl: string
  ) {
    host.log(`Installing application: ${appName}`, true);
    host.showInformationMessage(`Installing application: ${appName}`);
    await nhctl.install(host, appName, gitUrl);
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
    host.log(`Application ${appName} uninstalled`, true);
    host.showInformationMessage(`Application ${appName} uninstalled`);
  }

  private async cloneCode(host: Host, appName: string, workloadName: string) {
    const appConfig = fileStore.get(appName) || {};
    let destDir: string | undefined;
    const nocalhostConfig = await this.getNocalhostConfig();
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
        const workloadConfig = appConfig[workloadName] || {};
        workloadConfig["directory"] = destDir;
        appConfig[workloadName] = workloadConfig;
        fileStore.set(appName, appConfig);
        nocalhostConfig.svcConfigs.forEach((conf) => {
          if (conf.name === workloadName) {
            conf.localWorkDir = destDir as string;
            return;
          }
        });
        this.writeConfig(appName, nocalhostConfig);
      }
    }
    return destDir;
  }

  async startDevMode(
    host: Host,
    appName: string,
    node: ControllerResourceNode
  ) {
    let appConfig = fileStore.get(appName) || {};
    const currentUri = vscode.workspace.rootPath;
    let workloadConfig = appConfig[node.name] || {};
    appConfig[node.name] = workloadConfig;
    fileStore.set(appName, appConfig);
    if (!workloadConfig.directory) {
      const result = await host.showInformationMessage(
        nls["tips.clone"],
        nls["bt.clone"],
        nls["bt.open.dir"]
      );
      if (result === nls["bt.clone"]) {
        const destDir = await this.cloneCode(host, appName, node.name);
        if (destDir) {
          const uri = vscode.Uri.file(destDir);
          vscode.commands.executeCommand("vscode.openFolder", uri, {
            forceReuseWindow: true,
          });
          return;
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
            vscode.commands.executeCommand("vscode.openFolder", uris[0], {
              forceReuseWindow: true,
            });
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
        nls["bt.open.other"],
        nls["bt.open.dir"],
        "cancel"
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
          vscode.commands.executeCommand("vscode.openFolder", uris[0], {
            forceReuseWindow: true,
          });
          return;
        }
      } else if (result === nls["bt.open.dir"]) {
        const uri = vscode.Uri.file(workloadConfig.directory);
        vscode.commands.executeCommand("vscode.openFolder", uri, {
          forceReuseWindow: true,
        });
        return;
      }
    }

    // fresh config
    appConfig = fileStore.get(appName);
    workloadConfig = appConfig[node.name];
    const nocalhostConfig = await this.getNocalhostConfig();
    nocalhostConfig.svcConfigs.map((config) => {
      if (config.name === node.name) {
        if (!config.sync) {
          config.sync = [];
        }
        if (!config.sync.includes(workloadConfig.directory)) {
          config.sync.push(workloadConfig.directory);
        }
        return;
      }
    });

    await this.writeConfig(appName, nocalhostConfig);

    await vscode.window.withProgress(
      {
        title: "Starting DevMode",
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
      },
      async (progress) => {
        try {
          node.setStatus(DeploymentStatus.starting);
          host.getOutputChannel().show(true);
          progress.report({
            message: "replacing image",
            increment: 0,
          });
          host.log("replace image ...", true);
          await nhctl.replaceImage(host, appName, node.name);
          host.log("replace image end", true);
          host.log("", true);

          progress.report({
            message: "port forwarding",
            increment: 33,
          });
          host.log("port forward ...", true);
          const portForwardDispose = await nhctl.startPortForward(
            host,
            appName,
            node.name
          );
          host.pushDebugDispose(portForwardDispose);
          host.log("port forward end", true);
          host.log("", true);

          progress.report({
            message: "syncing file",
            increment: 66,
          });
          host.log("sync file ...", true);
          await nhctl.syncFile(host, appName, node.name);
          host.log("sync file end", true);
          host.log("", true);
          progress.report({
            message: "DevMode Started.",
            increment: 100,
          });
          node.setStatus(DeploymentStatus.developing);

          await this.exec(host, node);
        } catch (error) {
          node.setStatus("");
        }
      }
    );
  }

  private async getNocalhostConfig() {
    const appName = fileStore.get(SELECTED_APP_NAME);
    const configPath = path.resolve(
      NHCTL_DIR,
      "application",
      appName,
      ".nocalhost",
      "config.yaml"
    );
    const config = (await fileUtil.readYaml(configPath)) as NocalhostConfig;

    return config;
  }

  async endDevMode(host: Host, appName: string, node: ControllerResourceNode) {
    host.getOutputChannel().show(true);
    host.showInformationMessage("Ending DevMode.");
    host.log("Ending DevMode ...", true);
    await nhctl.endDevMode(host, appName, node.name);
    node.setStatus("");
    host.showInformationMessage("DevMode Ended.");
    host.log("DevMode Ended", true);
  }

  async exec(host: Host, node: ControllerResourceNode) {
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
    const terminalDisposed = host.invokeInNewTerminal(command);
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
    const terminalDisposed = host.invokeInNewTerminal(command);
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
