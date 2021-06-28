import { Resource, ResourceStatus } from "../types/resourceType";
import { getResourceList } from "../../ctl/nhctl";
import state from "../../state";
import * as vscode from "vscode";
import ConfigService, {
  NocalhostConfig,
  NocalhostServiceConfig,
} from "../../service/configService";
import { AppInfo, BaseNocalhostNode, SvcProfile } from "../types/nodeType";

export const kubernetesResourceDevMode = (resourceNode: any) => (
  targetClass: any
) => {
  const prototype: {
    [key: string]: any;
  } = targetClass.prototype;
  prototype.getChildren = async function getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<any>> {
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
    const result = resource.map((item) => {
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
      const node = new resourceNode(
        this as BaseNocalhostNode,
        item.metadata.name,
        item.metadata.name,
        status.conditions || ((status as unknown) as string),
        svcProfile,
        nocalhostService,
        item
      );
      return node;
    });
    return this.sortResource(result);
  };
  prototype.updateData = async function (isInit?: boolean): Promise<any> {
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
  };
};
