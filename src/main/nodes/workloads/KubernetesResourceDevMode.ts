import { NhctlCommand } from "../../ctl/nhctl";
import state from "../../state";
import { INhCtlGetResult, IResourceStatus } from "../../domain";
import * as vscode from "vscode";

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
    let resource = state.getData(this.getNodeStateId()) as INhCtlGetResult[];
    if (!resource) {
      resource = (await this.updateData(true)) as INhCtlGetResult[];
    }
    const result = (resource || []).map((item) => {
      const info = item.info;
      const status = info.status as IResourceStatus;
      let description = item.description;
      const node = new resourceNode(
        this as BaseNocalhostNode,
        info,
        status.conditions || ((status as unknown) as string),
        description
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

    state.setData(this.getNodeStateId(), list, isInit);

    return list;
  };
};
