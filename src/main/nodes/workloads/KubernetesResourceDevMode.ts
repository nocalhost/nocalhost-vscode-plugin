import vscode from "vscode";

import { NhctlCommand } from "../../ctl/nhctl";
import state from "../../state";
import { INhCtlGetResult, IResourceStatus } from "../../domain";

import { BaseNocalhostNode } from "../types/nodeType";

export const kubernetesResourceDevMode =
  (resourceNode: any) => (targetClass: any) => {
    const prototype: {
      [key: string]: any;
    } = targetClass.prototype;

    prototype.getChildren = async function getChildren(
      parent?: BaseNocalhostNode
    ): Promise<vscode.ProviderResult<any>> {
      let obj = state.getData(this.getNodeStateId()) as {
        resource: INhCtlGetResult[];
      };
      if (!obj) {
        obj = (await this.updateData(true)) as {
          resource: INhCtlGetResult[];
        };
      }
      const { resource } = obj;
      const result = (resource || []).map((item) => {
        const info = item.info;
        const status = info.status as IResourceStatus;
        let description = item.description;
        const node = new resourceNode(
          this as BaseNocalhostNode,
          info,
          status?.conditions || (status as unknown as string),
          description,
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
        (await NhctlCommand.get(
          {
            kubeConfigPath: this.getKubeConfigPath(),
            namespace: appNode.namespace,
          },
          30 * 1000
        )
          .addArgument(this.resourceType)
          .addArgument("-a", appNode.name)
          .addArgument("-o", "json")
          .exec()) || [];

      const obj = {
        resource: list,
      };
      state.setData(this.getNodeStateId(), obj, isInit);
      return obj;
    };
  };
