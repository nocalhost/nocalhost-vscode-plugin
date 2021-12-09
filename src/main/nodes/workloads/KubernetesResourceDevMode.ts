import { NhctlCommand } from "../../ctl/nhctl";
import state from "../../state";
import { INhCtlGetResult, IResourceStatus } from "../../domain";
import * as vscode from "vscode";

import ConfigService, {
  NocalhostConfig,
  NocalhostServiceConfig,
} from "../../service/configService";
import { BaseNocalhostNode } from "../types/nodeType";

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
      resource: INhCtlGetResult[];
      appConfig: NocalhostConfig;
    };
    if (!obj) {
      obj = (await this.updateData(true)) as {
        resource: INhCtlGetResult[];
        appConfig: NocalhostConfig;
      };
    }
    const { resource, appConfig } = obj;
    const result = (resource || []).map((item) => {
      const info = item.info;
      const status = info.status as IResourceStatus;
      let description = item.description;
      const nocalhostServices = appConfig.services || [];
      let nocalhostService: NocalhostServiceConfig | undefined | null;
      for (let i = 0; i < nocalhostServices.length; i++) {
        if (nocalhostServices[i].name === item.info.metadata.name) {
          nocalhostService = nocalhostServices[i];
          break;
        }
      }
      const node = new resourceNode(
        this as BaseNocalhostNode,
        info,
        status.conditions || ((status as unknown) as string),
        description,
        nocalhostService,
        item.vpn
      );
      return node;
    });
    return this.sortResource(result);
  };
  prototype.updateData = async function (isInit?: boolean): Promise<any> {
    const appNode = this.getAppNode();
    // description
    const list: INhCtlGetResult[] =
      (await NhctlCommand.get({
        kubeConfigPath: this.getKubeConfigPath(),
        namespace: appNode.namespace,
      })
        .addArgument(this.resourceType)
        .addArgument("-a", appNode.name)
        .addArgument("-o", "json")
        .exec()) || [];

    const appConfig = await ConfigService.getAppConfig(
      appNode.getKubeConfigPath(),
      appNode.namespace,
      appNode.name
    );
    const obj = {
      resource: list,
      appConfig,
    };
    state.setData(this.getNodeStateId(), obj, isInit);

    return obj;
  };
};
