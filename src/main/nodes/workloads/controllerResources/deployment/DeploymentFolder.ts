import * as vscode from "vscode";
import * as fs from "fs";
import { orderBy } from "lodash";
import { getResourceList } from "../../../../ctl/nhctl";
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
import { List, Resource, ResourceStatus } from "../../../types/resourceType";
import { Deployment } from "./Deployment";
import host from "../../../../host";

export class DeploymentFolder extends KubernetesResourceFolder {
  public resourceType = "Deployments";
  public async updateData(isInit?: boolean): Promise<any> {
    const appNode = this.getAppNode();

    const list: Resource[] = await getResourceList({
      kubeConfigPath: this.getKubeConfigPath(),
      kind: this.resourceType,
      namespace: appNode.namespace,
    });
    const appInfo = await appNode.freshApplicationInfo();
    const appConfig = await ConfigService.getAppConfig(
      appNode.getKubeConfigPath(),
      appNode.namespace,
      appNode.name
    );
    if (!appNode.parent.hasInit) {
      await appNode.parent.updateData(true);
    }
    const resource = this.filterResource(list, appNode);
    const obj = {
      resource: resource,
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
      resource: Resource[];
      appInfo: AppInfo;
      appConfig: NocalhostConfig;
    };
    if (!obj) {
      obj = (await this.updateData(true)) as {
        resource: Resource[];
        appInfo: AppInfo;
        appConfig: NocalhostConfig;
      };
    }
    const { resource, appConfig, appInfo } = obj;
    const result: Deployment[] = resource.map((item) => {
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
    return this.sortResource<Deployment>(result);
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
