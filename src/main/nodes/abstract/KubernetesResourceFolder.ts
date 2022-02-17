import state from "../../state";
import vscode from "vscode";
import { orderBy } from "lodash-es";
import { ControllerResourceNode } from "../workloads/controllerResources/ControllerResourceNode";
import { NhctlCommand } from "../../ctl/nhctl";
import { NocalhostFolderNode } from "./NocalhostFolderNode";
import { AppNode } from "../AppNode";
import { BaseNocalhostNode } from "../types/nodeType";
import { DevSpaceNode } from "../DevSpaceNode";
import { RefreshData } from "../impl/updateData";
import { IK8sResource } from "../../domain/IK8sResource";
import { INhCtlGetResult } from "../../domain";

export abstract class KubernetesResourceFolder
  extends NocalhostFolderNode
  implements RefreshData
{
  public abstract label: string;
  public abstract type: string;
  public abstract resourceType: string;
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    const collapseState =
      state.get(this.getNodeStateId()) ||
      vscode.TreeItemCollapsibleState.Collapsed;
    let treeItem = new vscode.TreeItem(this.label, collapseState);
    return treeItem;
  }

  public getAppNode(parent?: BaseNocalhostNode): AppNode {
    let node: BaseNocalhostNode | null | undefined;
    if (parent) {
      node = parent.getParent(parent);
    } else {
      node = this.getParent(this);
    }
    if (node instanceof AppNode) {
      return node;
    } else {
      return this.getAppNode(node as BaseNocalhostNode);
    }
  }

  public async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    return [];
  }
  public getAppName() {
    const appNode = this.getAppNode();
    return appNode.name;
  }

  public getKubeConfigPath() {
    const appNode = this.getAppNode();
    return appNode.getKubeConfigPath();
  }

  public async sortResource<T extends ControllerResourceNode>(arr: Array<T>) {
    return orderBy(arr, ["name"]);
  }

  public async updateData(isInit?: boolean): Promise<INhCtlGetResult[]> {
    const appNode = this.getAppNode();
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
  }

  private isOther(
    r: IK8sResource,
    appName: string,
    installedAppName: Array<string>
  ) {
    if (appName !== "default.application") {
      return false;
    }
    if (
      !(
        r.metadata &&
        r.metadata["annotations"] &&
        (r.metadata["annotations"]["meta.helm.sh/release-name"] ||
          r.metadata["annotations"]["dev.nocalhost/application-name"])
      )
    ) {
      return true;
    }

    if (
      r.metadata &&
      r.metadata["annotations"] &&
      r.metadata["annotations"]["dev.nocalhost/application-name"] &&
      !installedAppName.includes(
        r.metadata["annotations"]["dev.nocalhost/application-name"]
      )
    ) {
      return true;
    }

    if (
      r.metadata &&
      r.metadata["annotations"] &&
      r.metadata["annotations"]["meta.helm.sh/release-name"] &&
      !installedAppName.includes(
        r.metadata["annotations"]["meta.helm.sh/release-name"]
      )
    ) {
      return true;
    }

    return false;
  }

  public filterResource(resources: Array<IK8sResource>, appNode: AppNode) {
    // const isLocal = host.getGlobalState(IS_LOCAL);
    // if (isLocal) {
    //   return resources;
    // }
    return resources.filter((r) => {
      if (
        r.metadata &&
        r.metadata["annotations"] &&
        r.metadata["annotations"]["dev.nocalhost/application-name"] ===
          appNode.name
      ) {
        return true;
      }

      if (
        r.metadata &&
        r.metadata["annotations"] &&
        r.metadata["annotations"]["meta.helm.sh/release-name"] === appNode.name
      ) {
        return true;
      }
      const devspace = appNode.getParent() as DevSpaceNode;
      const installedAppNames = devspace.installedApps.map((item) => item.name);

      if (this.isOther(r, appNode.name, installedAppNames)) {
        return true;
      }

      return false;
    });
  }
}
