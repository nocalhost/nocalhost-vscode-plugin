import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

import ICommand from "./ICommand";
import { INSTALL_APP } from "./constants";
import registerCommand from "./register";
import host, { Host } from "../host";
import * as nhctl from "../ctl/nhctl";
import { AppNode } from "../nodes/AppNode";
import { DevSpaceNode } from "../nodes/DevSpaceNode";
import state from "../state";
import Bookinfo from "../common/bookinfo";

export default class InstallCommand implements ICommand {
  command: string = INSTALL_APP;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, true, this.execCommand.bind(this));
  }
  appNode: AppNode;
  async execCommand(appNode: AppNode) {
    if (!appNode) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }

    this.appNode = appNode;

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
        refOrVersion = await host.showInputBoxIgnoreFocus({
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
        valuesStr = await host.showInputBoxIgnoreFocus({
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
        const resPath = await host.showInputBoxIgnoreFocus({
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
    const devspaceNode = appNode.getParent() as DevSpaceNode;
    devspaceNode.updateData();
    Bookinfo.checkInstall(appNode);
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
    state.setAppState(this.appNode.getNodeStateId(), "installing", true);
    host.log(`Installing application: ${appName}`, true);
    await nhctl
      .install({
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
        refOrVersion,
      })
      .finally(() => {
        state.deleteAppState(this.appNode.getNodeStateId(), "installing");
      });
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
    await vscode.commands.executeCommand("Nocalhost.refresh");
    await host.delay(1000);
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
        (await nhctl
          .getPodNames({
            name,
            kind: type,
            namespace,
            kubeConfigPath,
          })
          .catch(() => {})) || [];
    }

    return podNameArr;
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
