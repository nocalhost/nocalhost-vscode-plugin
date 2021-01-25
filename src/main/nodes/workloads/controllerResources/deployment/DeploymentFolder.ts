import * as vscode from "vscode";

import * as kubectl from "../../../../ctl/kubectl";
import host from "../../../../host";
import ConfigService, {
  NocalhostServiceConfig,
} from "../../../../service/configService";
import state from "../../../../state";
import { KubernetesResourceFolder } from "../../../abstract/KubernetesResourceFolder";
import { DEPLOYMENT_FOLDER } from "../../../nodeContants";
import {
  BaseNocalhostNode,
  PortForwardData,
  SvcProfile,
} from "../../../types/nodeType";
import { List, ResourceStatus } from "../../../types/resourceType";
import { Deployment } from "./Deployment";

export class DeploymentFolder extends KubernetesResourceFolder {
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  public label: string = "Deployments";
  public type: string = DEPLOYMENT_FOLDER;
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<Deployment[]>> {
    const res = await kubectl.getResourceList(
      this.getKubeConfigPath(),
      "Deployments"
    );
    const list = JSON.parse(res as string) as List;
    const appNode = this.getAppNode();
    const appInfo = await appNode.getApplicationInfo();
    const currentAppStatus = await appNode.getCurrentAppStatus();
    const appConfig = await ConfigService.getAppConfig(appNode.name);
    const result: Deployment[] = list.items.map((item) => {
      const status = item.status as ResourceStatus;
      const svcProfiles = appInfo.svcProfile || [];
      const svcStatusInfos = currentAppStatus.svcProfile || [];
      let svcProfile: SvcProfile | undefined | null;
      let svcStatusInfo: (SvcProfile & PortForwardData) | undefined | null;
      const nocalhostServices = appConfig.services || [];
      let nocalhostService: NocalhostServiceConfig | undefined | null;
      for (let i = 0; i < svcProfiles.length; i++) {
        if (svcProfiles[i].name === item.metadata.name) {
          svcProfile = svcProfiles[i];
          break;
        }
      }
      for (let i = 0; i < svcStatusInfos.length; i++) {
        if (
          svcStatusInfos[i] &&
          svcStatusInfos[i].actualName === item.metadata.name
        ) {
          svcStatusInfo = svcStatusInfos[i];
          break;
        }
      }
      for (let i = 0; i < nocalhostServices.length; i++) {
        if (nocalhostServices[i].name === item.metadata.name) {
          nocalhostService = nocalhostServices[i];
          break;
        }
      }
      const node = new Deployment(
        this,
        item.metadata.name,
        item.metadata.name,
        status.conditions || ((status as unknown) as string),
        svcProfile,
        svcStatusInfo,
        nocalhostService,
        item
      );
      return node;
    });
    return result;
  }

  // TODO: DO NOT DELETE, FOR: [webview integration]

  // getTreeItem(): vscode.TreeItem | Promise<vscode.TreeItem> {
  //   let treeItem = new vscode.TreeItem(
  //     this.label,
  //     vscode.TreeItemCollapsibleState.None
  //   );
  //   treeItem.label = this.label;
  //   treeItem.command = {
  //     command: "Nocalhost.loadWorkloads",
  //     title: "loadWorkloads",
  //     arguments: [this],
  //   };
  //   return treeItem;
  // }
}
