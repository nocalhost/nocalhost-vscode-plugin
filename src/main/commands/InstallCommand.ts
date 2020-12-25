import * as vscode from "vscode";

import ICommand from "./ICommand";
import { INSTALL_APP, REFRESH } from "./constants";
import registerCommand from "./register";
import state from "../state";
import host, { Host } from "../host";
import * as fileStore from "../store/fileStore";
import { updateAppInstallStatus } from "../api";
import * as nhctl from "../ctl/nhctl";
import * as kubectl from "../ctl/kubectl";
import { AppNode } from "../nodes/AppNode";
import { NocalhostAccountNode } from "../nodes/NocalhostAccountNode";
import { List, ResourceStatus } from "../nodes/types/resourceType";

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

    const r = await host.showInformationMessage(
      "Specified version or use default version",
      { modal: true },
      "Specify one",
      "Use Default"
    );
    if (!r) {
      return;
    }
    let refOrVersion: string | undefined;

    if (r === "Specify one") {
      let msg = "";
      if (appNode.installType === "helmRepo") {
        msg = "please input the version of chart";
      } else {
        msg = "please input the ref of repository";
      }
      refOrVersion = await host.showInputBox({
        placeHolder: msg,
      });

      if (!refOrVersion) {
        return;
      }
    }
    let values: string | undefined;
    if (["helmGit", "helmRepo"].includes(appNode.installType)) {
      const res = await host.showInformationMessage(
        "Do you want to specify a values.yaml?",
        { modal: true },
        "Specify One",
        "Use Default values"
      );
      if (!res) {
        return;
      }
      if (res === "Specify One") {
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
      }
    }
    state.setAppState(appNode.label, "installing", true, {
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
      appNode.getKUbeconfigPath(),
      appNode.info.name,
      appNode.id,
      appNode.devSpaceId,
      appNode.info.url,
      appNode.installType,
      appNode.resourceDir,
      values,
      refOrVersion
    )
      .then(() => {
        const bookInfoUrls = [
          "https://github.com/nocalhost/bookinfo.git",
          "git@github.com:nocalhost/bookinfo.git",
          "https://e.coding.net/codingcorp/nocalhost/bookinfo.git",
          "git@e.coding.net:codingcorp/nocalhost/bookinfo.git",
        ];
        if (
          bookInfoUrls.includes(appNode.info.url) &&
          appNode.info.name === "bookinfo"
        ) {
          this.checkStatus(appNode);
        }
      })
      .finally(() => {
        appNode.expanded();
        appNode.expandWorkloadNode();
        state.deleteAppState(appNode.label, "installing", {
          refresh: true,
          nodeStateId: appNode.getNodeStateId(),
        });
      });
  }

  private async install(
    host: Host,
    kubeconfigPath: string,
    appName: string,
    appId: number,
    devSpaceId: number,
    gitUrl: string,
    installType: string,
    resourceDir: Array<string>,
    values: string | undefined,
    refOrVersion: string | undefined
  ) {
    host.log(`Installing application: ${appName}`, true);
    await nhctl.install(
      host,
      kubeconfigPath,
      appName,
      gitUrl,
      installType,
      resourceDir,
      values,
      refOrVersion
    );
    await updateAppInstallStatus(appId, devSpaceId, 1);
    fileStore.set(appName, {});
    host.log(`Application ${appName} installed`, true);
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
      appNode.getKUbeconfigPath(),
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
    terminalCommands.push("--kubeconfig", appNode.getKUbeconfigPath());
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
}
