import * as vscode from "vscode";

import * as kubectl from "../../../../ctl/kubectl";
import host from "../../../../host";
import ConfigService, {
  NocalhostConfig,
  NocalhostServiceConfig,
} from "../../../../service/configService";
import state from "../../../../state";
import { KubernetesResourceFolder } from "../../../abstract/KubernetesResourceFolder";
import { DEPLOYMENT_FOLDER } from "../../../nodeContants";
import {
  AppInfo,
  BaseNocalhostNode,
  SvcProfile,
} from "../../../types/nodeType";
import { List, ResourceStatus } from "../../../types/resourceType";
import { Deployment } from "./Deployment";

export class DeploymentFolder extends KubernetesResourceFolder {
  public async updateData(isInit?: boolean): Promise<any> {
    const res = await kubectl.getResourceList(
      this.getKubeConfigPath(),
      "Deployments"
    );
    const list = JSON.parse(res as string) as List;
    const appNode = this.getAppNode();
    
    const appInfo = await appNode.freshApplicationInfo();
    const appConfig = await ConfigService.getAppConfig(
      appNode.getKubeConfigPath(),
      appNode.name
    );

    const obj = {
      list,
      appInfo,
      appConfig,
    };

    state.setData(this.getNodeStateId(), obj, isInit);

    return obj;
  }
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
    state.setNode(this.getNodeStateId(), this);
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  public label: string = "Deployments";
  public type: string = DEPLOYMENT_FOLDER;
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<Deployment[]>> {
    let obj = state.getData(this.getNodeStateId()) as {
      list: List;
      appInfo: AppInfo;
      appConfig: NocalhostConfig;
    };
    if (!obj) {
      obj = (await this.updateData(true)) as {
        list: List;
        appInfo: AppInfo;
        appConfig: NocalhostConfig;
      };
    }
    const { list, appConfig, appInfo } = obj;
    const result: Deployment[] = list.items.map((item) => {
      const status = item.status as ResourceStatus;
      const svcProfiles = appInfo.svcProfile || [];
      let svcProfile: SvcProfile | undefined | null;
      const nocalhostServices = appConfig.services || [];
      let nocalhostService: NocalhostServiceConfig | undefined | null;
      for (let i = 0; i < svcProfiles.length; i++) {
        if (svcProfiles[i].actualName === item.metadata.name) {
          svcProfile = svcProfiles[i];
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
