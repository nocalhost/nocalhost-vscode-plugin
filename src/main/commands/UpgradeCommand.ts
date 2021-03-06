import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

import ICommand from "./ICommand";
import { UPGRADE_APP } from "./constants";
import registerCommand from "./register";
import state from "../state";
import host from "../host";
import * as nhctl from "../ctl/nhctl";
import * as kubectl from "../ctl/kubectl";
import { AppNode } from "../nodes/AppNode";
import { NocalhostAccountNode } from "../nodes/NocalhostAccountNode";

export default class UpgradeCommand implements ICommand {
  command: string = UPGRADE_APP;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, true, this.execCommand.bind(this));
  }
  async execCommand(appNode: AppNode) {
    if (!appNode) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }

    let refOrVersion: string | undefined;
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
        host.showErrorMessage("Not found config.yaml");
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
        repoMsg = "Which version to upgrade?";
        btMsg = "Latest Version";
      } else {
        repoMsg = "Which branch to upgrade(Manifests in Git Repo)?";
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
    state.setAppState(appNode.name, "upgrading", true, {
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
    // end port
    await host.showProgressing(`Ending port-forward`, async (progress) => {
      await this.endAllPortForward(appNode);
    });
    await nhctl
      .upgrade(
        appNode.getKubeConfigPath(),
        appNode.name,
        appNode.url,
        appNode.installType,
        appNode.resourceDir,
        appNode.appConfig,
        local,
        refOrVersion
      )
      .then(() => {
        appNode.expanded();
        appNode.expandWorkloadNode();
      })
      .finally(() => {
        state.deleteAppState(appNode.name, "upgrading", {
          refresh: true,
          nodeStateId: appNode.getNodeStateId(),
        });
      });
    await this.startPortForward(appNode);
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
          configs.push(filePath);
        }
      }
    });

    return configs;
  }

  private async endAllPortForward(appNode: AppNode) {
    const appInfo = await appNode.getApplicationInfo();
    const serivces = appInfo.svcProfile;
    for (let i = 0; i < serivces.length; i++) {
      const service = serivces[i];
      const portForwardList = service.devPortForwardList || [];
      for (let j = 0; j < portForwardList.length; j++) {
        await nhctl.endPortForward(
          appNode.getKubeConfigPath(),
          appNode.name,
          service.actualName,
          `${portForwardList[j].localport}:${portForwardList[j].remoteport}`,
          service.rawConfig.serviceType
        );
      }
    }
  }

  private async startPortForward(appNode: AppNode) {
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
          await nhctl
            .startPortForward(
              host,
              appNode.getKubeConfigPath(),
              appNode.name,
              service.name,
              "manual",
              service.serviceType,
              ports,
              podName
            )
            .catch(() => {});
        }
      }
    }
  }
}
