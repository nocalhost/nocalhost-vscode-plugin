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

export default class InstallCommand implements ICommand {
  command: string = INSTALL_APP;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, true, this.execCommand.bind(this));
  }
  async execCommand(appNode: AppNode) {
    if (!appNode) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }

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
      }
    }
    state.setAppState(appNode.name, "installing", true, {
      refresh: true,
      nodeStateId: appNode.getNodeStateId(),
    });
    // make siblings collapsis
    const siblings: (
      | AppNode
      | NocalhostAccountNode
    )[] = await appNode.siblings();
    siblings.forEach((item) => {
      const node = item as AppNode;
      node.collapsis();
    });

    await this.install(
      host,
      appNode.getKubeConfigPath(),
      appNode.name,
      appNode.id,
      appNode.appConfig,
      appNode.helmNHConfig ? appNode.getHelmHNConfigPath() : "",
      appNode.devSpaceId,
      appNode.url,
      appNode.installType,
      appNode.resourceDir,
      values,
      valuesStr,
      refOrVersion,
      local
    )
      .then(() => {
        const bookInfoUrls = [
          "https://github.com/nocalhost/bookinfo.git",
          "git@github.com:nocalhost/bookinfo.git",
          "https://e.coding.net/codingcorp/nocalhost/bookinfo.git",
          "git@e.coding.net:codingcorp/nocalhost/bookinfo.git",
        ];
        if (bookInfoUrls.includes(appNode.url) && appNode.name === "bookinfo") {
          this.checkStatus(appNode);
        }
      })
      .finally(() => {
        appNode.expanded();
        appNode.expandWorkloadNode();
        state.deleteAppState(appNode.name, "installing", {
          refresh: true,
          nodeStateId: appNode.getNodeStateId(),
        });
      });
    // await host.delay(1000);
    const nocalhostConfig = await appNode.getNocalhostConfig();
    if (nocalhostConfig && nocalhostConfig.services) {
      const services = nocalhostConfig.services;
      for (let i = 0; i < services.length; i++) {
        const service = services[i];
        const containers = service.containers;
        let ports: Array<string> = [];
        const podNameArr = await kubectl.getPodNames(
          service.name,
          service.serviceType,
          appNode.getKubeConfigPath()
        );
        if (podNameArr && podNameArr.length <= 0) {
          host.showErrorMessage("Not found pod");
          return;
        }
        const podName = podNameArr[0];
        for (let j = 0; j < containers.length; j++) {
          const container = containers[j];
          if (container.install && container.install.portForward) {
            ports = ports.concat(container.install.portForward);
          }
        }
        if (ports.length > 0) {
          await nhctl.startPortForward(
            host,
            appNode.getKubeConfigPath(),
            appNode.name,
            service.name,
            "manual",
            service.serviceType,
            ports,
            podName
          );
        }
      }
    }
    await vscode.commands.executeCommand(REFRESH);
  }

  private async install(
    host: Host,
    kubeconfigPath: string,
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
    await updateAppInstallStatus(appId, devSpaceId, 1);
    host.setGlobalState(appName, {});
  }

  private async checkStatus(appNode: AppNode) {
    const check = await this.checkBookInfoStatus(appNode).catch(() => {});
    if (check) {
      this.portForwordService(appNode);
      return;
    }
    setTimeout(() => {
      this.checkStatus(appNode);
    }, 2000);
  }

  private async checkBookInfoStatus(appNode: AppNode) {
    const res = await kubectl.getResourceList(
      appNode.getKubeConfigPath(),
      "Deployments"
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

  private async portForwordService(appNode: AppNode) {
    const terminalCommands = [
      "port-forward",
      "services/productpage",
      "39080:9080",
    ];
    terminalCommands.push("--kubeconfig", appNode.getKubeConfigPath());
    const shellPath = "kubectl";
    const terminalDisposed = host.invokeInNewTerminalSpecialShell(
      terminalCommands,
      process.platform === "win32" ? `${shellPath}.exe` : shellPath,
      "kubectl"
    );
    host.pushBookInfoDispose(terminalDisposed);
    terminalDisposed.show();
    const res = await host.showInformationMessage(
      `productpage url: http://127.0.0.1:39080/productpage`,
      { modal: true },
      "go"
    );
    await vscode.commands.executeCommand(REFRESH);
    if (res === "go") {
      const uri = vscode.Uri.parse("http://127.0.0.1:39080/productpage");
      vscode.env.openExternal(uri);
    }
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
