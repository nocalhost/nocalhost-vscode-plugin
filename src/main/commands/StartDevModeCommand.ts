import * as vscode from "vscode";
import * as os from "os";
import { INhCtlGetResult, IDescribeConfig } from "../domain";
import ICommand from "./ICommand";
import { NhctlCommand, getContainers } from "./../ctl/nhctl";
import { START_DEV_MODE, SYNC_SERVICE } from "./constants";
import registerCommand from "./register";
import { get as _get } from "lodash";
import { openDevSpaceExec } from "../ctl/shell";
import {
  TMP_APP,
  TMP_CONTAINER,
  TMP_DEVSPACE,
  TMP_DEVSTART_APPEND_COMMAND,
  TMP_ID,
  TMP_KUBECONFIG_PATH,
  TMP_NAMESPACE,
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
import * as nls from "../../../package.nls.json";
import { replaceSpacePath } from "../utils/fileUtil";
import { BaseNocalhostNode, DeploymentStatus } from "../nodes/types/nodeType";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import { appTreeView } from "../extension";
import messageBus from "../utils/messageBus";
import logger from "../utils/logger";
import { existsSync } from "fs";
import { getContainer } from "../utils/getContainer";
import SyncServiceCommand from "./SyncServiceCommand";

export interface ControllerNodeApi {
  name: string;
  resourceType: string;
  setStatus: (status: string) => Promise<void>;
  getStatus: (refresh?: boolean) => Promise<string> | string;
  setContainer: (container: string) => Promise<void>;
  getContainer: () => Promise<string>;
  getKubeConfigPath: () => string;
  getAppName: () => string;
  getParent: () => BaseNocalhostNode;
  getStorageClass: () => string | undefined;
  getDevStartAppendCommand: () => string | undefined;
  getSpaceName: () => string;
  getNameSpace: () => string;
}

export default class StartDevModeCommand implements ICommand {
  command: string = START_DEV_MODE;
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    registerCommand(context, this.command, true, this.execCommand.bind(this));
  }

  private node: ControllerNodeApi;
  async execCommand(
    node: ControllerNodeApi,
    mode: "replace" | "copy" = "replace"
  ) {
    if (!node) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }

    this.node = node;

    await NhctlCommand.authCheck({
      base: "dev",
      args: ["start", node.getAppName(), "-t" + node.resourceType, node.name],
      kubeConfigPath: node.getKubeConfigPath(),
      namespace: node.getNameSpace(),
    }).exec();

    if (node instanceof ControllerResourceNode && appTreeView) {
      await appTreeView.reveal(node, { select: true, focus: true });
    }
    host.log("[start dev] Initializing..", true);

    const resource: INhCtlGetResult = await NhctlCommand.get({
      kubeConfigPath: node.getKubeConfigPath(),
      namespace: node.getNameSpace(),
    })
      .addArgumentStrict(node.resourceType, node.name)
      .addArgument("-a", node.getAppName())
      .addArgument("-o", "json")
      .exec();

    const description: IDescribeConfig =
      resource.description || Object.create(null);

    const containers = await getContainers({
      appName: node.getAppName(),
      name: node.name,
      resourceType: node.resourceType.toLocaleLowerCase(),
      namespace: node.getNameSpace(),
      kubeConfigPath: node.getKubeConfigPath(),
    });

    if (!containers || containers.length === 0) {
      vscode.window.showErrorMessage("No container available");
    }
    let containerName = containers[0];

    if (containers.length > 1) {
      containerName = await host.showQuickPick(containers);
    }

    host.log(`[start dev] Container: ${containerName}`, true);

    if (containerName === "nocalhost-dev") {
      let r = await host.showInformationMessage(
        `This container is developing. You may have problem after enter DevMode at the same time. Do you want to continue?`,
        { modal: true },
        "confirm"
      );
      if (r !== "confirm") {
        return;
      }
    }
    const appName = node.getAppName();
    const destDir = await this.cloneOrGetFolderDir(
      appName,
      node,
      containerName,
      description.associate
    );
    if (!destDir) {
      return;
    }

    // check image
    let image: string | undefined = await this.getImage(
      node.getKubeConfigPath(),
      node.getNameSpace(),
      appName,
      node.name,
      node.resourceType,
      containerName
    );
    if (!image) {
      const result = await host.showInformationMessage(
        "Please specify development image",
        { modal: true },
        "Select",
        "Custom"
      );
      if (!result) {
        return;
      }
      if (result === "Select") {
        const images = [
          "nocalhost-docker.pkg.coding.net/nocalhost/dev-images/java:11",
          "nocalhost-docker.pkg.coding.net/nocalhost/dev-images/ruby:3.0",
          "nocalhost-docker.pkg.coding.net/nocalhost/dev-images/node:14",
          "nocalhost-docker.pkg.coding.net/nocalhost/dev-images/python:3.9",
          "nocalhost-docker.pkg.coding.net/nocalhost/dev-images/golang:1.16",
          "nocalhost-docker.pkg.coding.net/nocalhost/dev-images/perl:latest",
          "nocalhost-docker.pkg.coding.net/nocalhost/dev-images/rust:latest",
          "nocalhost-docker.pkg.coding.net/nocalhost/dev-images/php:latest",
        ];
        image = await host.showQuickPick(images);
      } else if (result === "Custom") {
        image = await host.showInputBox({
          placeHolder: "Please input your image address",
        });
        if (!image) {
          return;
        }
      }
    }

    await this.saveConfig(
      node.getKubeConfigPath(),
      node.getNameSpace(),
      appName,
      node.name,
      node.resourceType,
      containerName,
      "image",
      image as string
    );
    if (
      destDir === true ||
      (destDir && destDir === host.getCurrentRootPath())
    ) {
      await this.startDevMode(host, appName, node, containerName, mode);
    } else if (destDir) {
      this.saveAndOpenFolder(appName, node, destDir, containerName);
      messageBus.emit("devstart", {
        name: appName,
        destDir,
        container: containerName,
      });
    }
  }

  private saveAndOpenFolder(
    appName: string,
    node: ControllerNodeApi,
    destDir: string,
    containerName: string
  ) {
    const currentUri = host.getCurrentRootPath();

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
    kubeConfigPath: string,
    namespace: string,
    appName: string,
    workloadName: string,
    wrokloadType: string,
    containerName: string
  ) {
    let destDir: string | undefined;
    let gitUrl: string | undefined = await this.getGitUrl(
      kubeConfigPath,
      namespace,
      appName,
      workloadName,
      wrokloadType,
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
        await this.saveConfig(
          kubeConfigPath,
          namespace,
          appName,
          workloadName,
          wrokloadType,
          containerName,
          "gitUrl",
          gitUrl
        );
        await host.showProgressing("Starting DevMode", async (progress) => {
          progress.report({
            message: "cloning code",
          });
          await git.clone(host, gitUrl as string, [
            replaceSpacePath(destDir) as string,
          ]);
        });
      }
    }
    return destDir;
  }

  private async saveConfig(
    kubeConfigPath: string,
    namespace: string,
    appName: string,
    workloadName: string,
    workloadType: string,
    containerName: string,
    key: string,
    value: string
  ) {
    await nhctl.profileConfig({
      kubeConfigPath,
      namespace,
      workloadType,
      workloadName,
      appName,
      containerName,
      key,
      value,
    });
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
      destDir = await this.cloneCode(
        host,
        node.getKubeConfigPath(),
        node.getNameSpace(),
        appName,
        node.name,
        node.resourceType,
        containerName
      );
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

  private async getTargetDirectory() {
    let destDir: string | undefined;

    const getUrl = async () => {
      const uris = await host.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
      });
      if (uris && uris.length > 0) {
        destDir = uris[0].fsPath;
      }
    };

    const result = await host.showInformationMessage(
      nls["tips.open"],
      { modal: true },
      nls["bt.open.other"],
      nls["bt.open.dir"]
    );
    if (result === nls["bt.open.other"]) {
      await getUrl();
    } else if (result === nls["bt.open.dir"]) {
      destDir = await this.getAssociateDirectory();

      if (!existsSync(destDir)) {
        destDir = undefined;

        const res = await host.showInformationMessage(
          "The directory does not exist, do you want to associate the new source code directory.",
          { modal: true },
          "Associate"
        );

        if (res === "Associate") {
          await getUrl();
        }
      }
    }

    return destDir;
  }

  private async getAssociateDirectory(): Promise<string> {
    const node = this.node;
    const profile = await nhctl.getServiceConfig(
      node.getKubeConfigPath(),
      node.getNameSpace(),
      node.getAppName(),
      node.name,
      node.resourceType
    );

    return profile.associate;
  }

  private async cloneOrGetFolderDir(
    appName: string,
    node: ControllerNodeApi,
    containerName: string,
    associateDir: string
  ) {
    let destDir: string | undefined | boolean = associateDir;

    const currentUri = host.getCurrentRootPath();

    if (!(await this.getAssociateDirectory())) {
      destDir = await this.firstOpen(appName, node, containerName);
    } else if (currentUri !== (await this.getAssociateDirectory())) {
      destDir = await this.getTargetDirectory();
    } else {
      destDir = true;
    }

    if (destDir && destDir !== true) {
      await nhctl.associate(
        node.getKubeConfigPath(),
        node.getNameSpace(),
        node.getAppName(),
        destDir as string,
        node.resourceType,
        node.name,
        containerName
      );

      if (host.getCurrentRootPath() === destDir) {
        SyncServiceCommand.checkSync();
      }
    }

    return destDir;
  }

  async startDevMode(
    host: Host,
    appName: string,
    node: ControllerNodeApi,
    containerName: string,
    mode: "replace" | "copy"
  ) {
    const currentUri = host.getCurrentRootPath() || os.homedir();

    try {
      await node.setStatus(DeploymentStatus.starting);
      host.getOutputChannel().show(true);

      host.log(`dev[${mode}] start ...`, true);
      let dirs: Array<string> | string = new Array<string>();
      let isOld = false;
      dirs = host.formalizePath(currentUri);
      // update deployment label
      node.setContainer(containerName);

      await nhctl.devStart(
        host,
        node.getKubeConfigPath(),
        node.getNameSpace(),
        appName,
        node.name,
        node.resourceType,
        {
          isOld: isOld,
          dirs: dirs,
        },
        mode,
        containerName,
        node.getStorageClass(),
        node.getDevStartAppendCommand()
      );
      host.log("dev start end", true);
      host.log("", true);

      host.log("sync file ...", true);

      await nhctl.syncFile(
        host,
        node.getKubeConfigPath(),
        node.getNameSpace(),
        appName,
        node.name,
        node.resourceType,
        containerName
      );

      host.log("sync file end", true);
      host.log("", true);
      node.setStatus("");
      const parent = node.getParent();
      if (parent && parent.updateData) {
        await parent.updateData(true);
      }
      await vscode.commands.executeCommand("Nocalhost.refresh", parent);

      // await vscode.commands.executeCommand(EXEC, node);
      const terminal = await openDevSpaceExec(
        node.getAppName(),
        node.name,
        node.resourceType,
        "nocalhost-dev",
        node.getKubeConfigPath(),
        node.getNameSpace(),
        null
      );
      host.pushDispose(
        node.getSpaceName(),
        node.getAppName(),
        node.name,
        terminal
      );

      vscode.commands.executeCommand(SYNC_SERVICE, {
        app: appName,
        resourceType: node.resourceType,
        service: node.name,
        kubeConfigPath: node.getKubeConfigPath(),
        namespace: node.getNameSpace(),
      });
    } catch (error) {
      logger.error(error);
      node.setStatus("");
    }
  }

  private setTmpStartRecord(
    appName: string,
    workloadPath: string,
    node: ControllerResourceNode,
    containerName: string
  ) {
    const appNode = node.getAppNode();
    host.setGlobalState(TMP_ID, node.getNodeStateId());
    host.setGlobalState(TMP_DEVSPACE, node.getSpaceName());
    host.setGlobalState(TMP_NAMESPACE, node.getNameSpace());
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

  private async getGitUrl(
    kubeConfigPath: string,
    namespace: string,
    appName: string,
    workloadName: string,
    workloadType: string,
    containerName: string
  ) {
    const config = await ConfigService.getContaienrConfig(
      kubeConfigPath,
      namespace,
      appName,
      workloadName,
      workloadType,
      containerName
    );
    let gitUrl = "";
    if (config) {
      gitUrl = config.dev.gitUrl;
    }

    return gitUrl;
  }

  private async getImage(
    kubeConfigPath: string,
    namespace: string,
    appName: string,
    workloadName: string,
    workloadType: string,
    containerName: string
  ) {
    const result = await nhctl.getImageByContainer({
      kubeConfigPath,
      namespace,
      workloadType,
      appName,
      workloadName,
      containerName,
    });
    if (!result) {
      return undefined;
    }
    return result.image;
  }

  async getPodAndContainer(node: ControllerNodeApi) {
    const kubeConfigPath = node.getKubeConfigPath();
    let podName: string | undefined;
    const podNameArr = await nhctl.getPodNames({
      name: node.name,
      kind: node.resourceType,
      namespace: node.getNameSpace(),
      kubeConfigPath: kubeConfigPath,
    });
    podName = podNameArr[0];
    if (!podName) {
      return;
    }
    let containerName: string | undefined = (await node.getContainer()) || "";

    if (!containerName) {
      const containerNameArr = await nhctl.getContainerNames({
        podName,
        kubeConfigPath,
        namespace: node.getNameSpace(),
      });
      if (containerNameArr.length === 1) {
        containerName = containerNameArr[0];
      } else {
        if (containerNameArr.length > 1) {
          containerName = await host.showQuickPick(containerNameArr);
        }
      }
    }

    return { containerName, podName };
  }
}
