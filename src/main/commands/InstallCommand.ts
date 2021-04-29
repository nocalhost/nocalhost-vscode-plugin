import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

import ICommand from "./ICommand";
import { INSTALL_APP, REFRESH } from "./constants";
import registerCommand from "./register";
import state from "../state";
import host, { Host } from "../host";
import { updateAppInstallStatus } from "../api";
import * as nhctl from "../ctl/nhctl";
import * as kubectl from "../ctl/kubectl";
import { AppNode } from "../nodes/AppNode";
import { NocalhostAccountNode } from "../nodes/NocalhostAccountNode";
import { List, Resource, ResourceStatus } from "../nodes/types/resourceType";
import logger from "../utils/logger";
import { DevSpaceNode } from "../nodes/DevSpaceNode";

export default class InstallCommand implements ICommand {
  command: string = INSTALL_APP;
  productPagePort = "";
  startTime = new Date().getTime();
  bookInfoUrls = [
    "https://github.com/nocalhost/bookinfo.git",
    "git@github.com:nocalhost/bookinfo.git",
    "https://e.coding.net/codingcorp/nocalhost/bookinfo.git",
    "git@e.coding.net:codingcorp/nocalhost/bookinfo.git",
  ];
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, true, this.execCommand.bind(this));
  }
  async execCommand(appNode: AppNode) {
    if (!appNode) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    let productPagePort = (this.productPagePort = "");
    let refOrVersion: string | undefined;
    let values: string | undefined;
    let valuesStr: string | undefined;
    let local:
      | {
          localPath: string;
          config: string;
        }
      | undefined = undefined;
    if (["helmLocal", "rawManifestLocal"].includes(appNode.installType)) {
      let confirm = await host.showInformationMessage(
        appNode.installType === "rawManifestLocal"
          ? "Please choose application manifest root directory"
          : "Please choose unpacked application helm chart root directory",
        { modal: true },
        "confirm"
      );
      if (confirm !== "confirm") {
        return;
      }
      let localPath = await host.showSelectFolderDialog(
        "Please select your local application"
      );
      if (!localPath) {
        return;
      }
      const configs = this.getAllConfig(
        path.resolve(localPath[0].fsPath, ".nocalhost")
      );
      let configPath: string | undefined = "";
      if (configs.length > 1) {
        // show select
        configPath = await vscode.window.showQuickPick(configs);
      } else if (configs.length === 0) {
        // select one
        let confirm = await host.showInformationMessage(
          "Please select your configuration file",
          { modal: true },
          "confirm"
        );
        if (confirm !== "confirm") {
          return;
        }
        const configUri = await host.showSelectFileDialog(
          "Please select your configuration file",
          vscode.Uri.file(localPath[0].fsPath)
        );
        if (configUri) {
          configPath = configUri[0].fsPath;
        }
      } else {
        configPath = configs[0];
      }
      if (!configPath) {
        return;
      }

      local = {
        localPath: localPath[0].fsPath,
        config: configPath,
      };
    } else {
      let repoMsg = "";
      let btMsg = "";
      if (appNode.installType === "helmRepo") {
        repoMsg = "Which version to install?";
        btMsg = "Default Version";
      } else if (appNode.installType === "kustomizeGit") {
        repoMsg = "Which branch to install(Kustomize in Git Repo)?";
        btMsg = "Default Branch";
      } else {
        repoMsg = "Which branch to install(Manifests in Git Repo)?";
        btMsg = "Default Branch";
      }

      const r = await host.showInformationMessage(
        repoMsg,
        { modal: true },
        btMsg,
        "Specify one"
      );
      if (!r) {
        return;
      }

      if (r === "Specify one") {
        let msg = "";
        if (appNode.installType === "helmRepo") {
          msg = "please input the version of chart";
        } else {
          msg = "please input the branch of repository";
        }
        refOrVersion = await host.showInputBox({
          placeHolder: msg,
        });

        if (!refOrVersion) {
          return;
        }
      }
    }
    if (["helmGit", "helmRepo", "helmLocal"].includes(appNode.installType)) {
      const res = await host.showInformationMessage(
        "Do you want to specify values?",
        { modal: true },
        "Use Default values",
        "Specify One values.yaml",
        "Specify values"
      );
      if (!res) {
        return;
      }
      if (res === "Specify One values.yaml") {
        const valuesUri = await host.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          title: "Select the value file path",
        });

        if (valuesUri && valuesUri.length > 0) {
          values = valuesUri[0].fsPath;
        } else {
          return;
        }
      } else if (res === "Specify values") {
        valuesStr = await host.showInputBox({
          placeHolder: "eg: key1=val1,key2=val2",
        });

        if (!valuesStr) {
          return;
        }
      }
    }
    let resourceDir: Array<string> | undefined;
    if (appNode.installType === "kustomizeGit") {
      const res = await host.showInformationMessage(
        "Do you want to specify a Kustomize path?",
        { modal: true },
        "Use Default path",
        "Specify One"
      );
      if (!res) {
        return;
      }
      if (res === "Specify One") {
        const resPath = await host.showInputBox({
          placeHolder: "please input your kustomize path",
        });
        if (!resPath) {
          return;
        }

        resourceDir = [resPath];
      }
    }

    await this.startInstall(
      appNode,
      values,
      valuesStr,
      refOrVersion,
      local,
      resourceDir
    );
    productPagePort = this.productPagePort;
    const devspaceNode = appNode.getParent() as DevSpaceNode;
    devspaceNode.updateData();
    if (this.isBookInfo(appNode) && productPagePort) {
      this.startTime = new Date().getTime();
      this.checkStatus(appNode, productPagePort);
    }
  }

  private async install(
    host: Host,
    kubeconfigPath: string,
    namespace: string,
    appName: string,
    appId: number,
    appConfig: string,
    helmNHConfigPath: string,
    devSpaceId: number,
    gitUrl: string,
    installType: string,
    resourceDir: Array<string>,
    values: string | undefined,
    valuesStr: string | undefined,
    refOrVersion: string | undefined,
    local:
      | {
          localPath: string;
          config: string;
        }
      | undefined
  ) {
    host.log(`Installing application: ${appName}`, true);
    await nhctl.install(
      host,
      kubeconfigPath,
      namespace,
      appName,
      appConfig,
      helmNHConfigPath,
      gitUrl,
      installType,
      resourceDir,
      local,
      values,
      valuesStr,
      refOrVersion
    );
    host.setGlobalState(appName, {});
  }

  private async checkStatus(appNode: AppNode, productPagePort: string) {
    if (host.bookinfo_timeout_id) {
      clearTimeout(host.bookinfo_timeout_id);
    }
    if (new Date().getTime() - this.startTime > 5 * 60 * 1000) {
      logger.info("time out to open productpage");
      return;
    }
    const check = await this.checkBookInfoStatus(appNode).catch(() => {});
    if (check) {
      const res = await host.showInformationMessage(
        `productpage url: http://127.0.0.1:${productPagePort}/productpage`,
        { modal: true },
        "go"
      );
      if (res === "go") {
        const uri = vscode.Uri.parse(
          `http://127.0.0.1:${productPagePort}/productpage`
        );
        vscode.env.openExternal(uri);
      }
      return;
    }
    host.bookinfo_timeout_id = setTimeout(() => {
      this.checkStatus(appNode, productPagePort);
    }, 2000);
  }

  private isBookInfo(appNode: AppNode) {
    if (
      this.bookInfoUrls.includes(appNode.url) &&
      appNode.name === "bookinfo"
    ) {
      return true;
    }

    return false;
  }

  private async startInstall(
    appNode: AppNode,
    values: string | undefined,
    valuesStr: string | undefined,
    refOrVersion: string | undefined,
    local: any,
    resourceDir?: Array<string>
  ) {
    await this.install(
      host,
      appNode.getKubeConfigPath(),
      appNode.namespace,
      appNode.name,
      appNode.id,
      appNode.appConfig,
      appNode.helmNHConfig ? appNode.getHelmHNConfigPath() : "",
      appNode.devSpaceId,
      appNode.url,
      appNode.installType,
      resourceDir || appNode.resourceDir,
      values,
      valuesStr,
      refOrVersion,
      local
    );

    await host.delay(1000);
    const nocalhostConfig = await appNode.getNocalhostConfig();
    if (
      nocalhostConfig &&
      nocalhostConfig.services &&
      nocalhostConfig.services.length > 0
    ) {
      const services = nocalhostConfig.services;
      for (let i = 0; i < services.length; i++) {
        const service = services[i];
        const containers = service.containers;
        let ports: Array<string> = [];
        for (let j = 0; j < containers.length; j++) {
          const container = containers[j];
          if (container.install && container.install.portForward) {
            ports = ports.concat(container.install.portForward);
          }
        }
        if (ports.length <= 0) {
          logger.info(`${service.name} port is null`);
          continue;
        }
        if (service.name === "productpage") {
          this.productPagePort = ports[0].split(":")[0];
        }
      }
    } else {
      logger.info("appname: " + appNode.name + "not service config");
    }
  }

  public async getPodNames(
    name: string,
    type: string,
    namespace: string,
    kubeConfigPath: string,
    timeout: number = 1000 * 60
  ) {
    let startTime = new Date().getTime();
    let podNameArr = new Array<string>();
    while (
      podNameArr &&
      podNameArr.length <= 0 &&
      new Date().getTime() - startTime < timeout
    ) {
      podNameArr =
        (await kubectl
          .getPodNames(name, type, namespace, kubeConfigPath)
          .catch(() => {})) || [];
    }

    return podNameArr;
  }

  private async checkBookInfoStatus(appNode: AppNode) {
    const res = await kubectl.getResourceList(
      appNode.getKubeConfigPath(),
      "Deployments",
      appNode.namespace
    );
    const list = JSON.parse(res as string) as List;
    let check = true;
    list.items.map((item) => {
      const conditionStatus = item.status as ResourceStatus;
      if (conditionStatus && conditionStatus.conditions) {
        const conditions = conditionStatus.conditions;
        let isAvaiable = false;
        for (let i = 0; i < conditions.length; i++) {
          if (
            conditions[i].type === "Available" &&
            conditions[i].status === "True"
          ) {
            isAvaiable = true;
            break;
          }
        }
        if (!isAvaiable) {
          check = false;
        }
      } else {
        check = false;
      }
    });

    return check;
  }

  private getAllConfig(localPath: string) {
    const configs = new Array<string>();
    const isExist = fs.existsSync(localPath);
    if (!isExist) {
      return configs;
    }
    const files = fs.readdirSync(localPath);
    files.forEach((filePath) => {
      const fullPath = path.resolve(localPath, filePath);
      const stat = fs.statSync(fullPath);
      if (stat.isFile()) {
        const extname = path.extname(fullPath);
        if ([".yaml", ".yml"].includes(extname)) {
          configs.push(fullPath);
        }
      }
    });

    return configs;
  }
}
