import * as vscode from "vscode";
import { getResourceList } from "../../../../ctl/nhctl";
import ConfigService, {
  NocalhostConfig,
  NocalhostServiceConfig,
} from "../../../../service/configService";
import state from "../../../../state";
import { KubernetesResourceFolder } from "../../../abstract/KubernetesResourceFolder";
import { STATEFUL_SET_FOLDER } from "../../../nodeContants";
import {
  AppInfo,
  BaseNocalhostNode,
  SvcProfile,
} from "../../../types/nodeType";
import { List, Resource, ResourceStatus } from "../../../types/resourceType";
import { StatefulSet } from "./StatefulSet";

export class StatefulSetFolder extends KubernetesResourceFolder {
  public resourceType: string = "StatefulSets";
  public label: string = "StatefulSets";
  public type: string = STATEFUL_SET_FOLDER;
  public async updateData(isInit?: boolean): Promise<any> {
    const appNode = this.getAppNode();
    const list = await getResourceList({
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
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
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
    const result: StatefulSet[] = resource.map((item) => {
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
      const node = new StatefulSet(
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

    return this.sortResource<StatefulSet>(result);
  }
}
