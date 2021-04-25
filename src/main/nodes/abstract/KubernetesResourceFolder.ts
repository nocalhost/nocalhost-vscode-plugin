import state from "../../state";
import * as vscode from "vscode";

import * as kubectl from "../../ctl/kubectl";
import { NocalhostFolderNode } from "./NocalhostFolderNode";
import { AppNode } from "../AppNode";
import { BaseNocalhostNode } from "../types/nodeType";
import { List, Resource } from "../types/resourceType";
import { DevSpaceNode } from "../DevSpaceNode";
import { RefreshData } from "../impl/updateData";
import host from "../../host";
import { IS_LOCAL } from "../../constants";

export abstract class KubernetesResourceFolder
  extends NocalhostFolderNode
  implements RefreshData {
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

  public getAppName() {
    const appNode = this.getAppNode();
    return appNode.name;
  }

  public getKubeConfigPath() {
    const appNode = this.getAppNode();
    return appNode.getKubeConfigPath();
  }

  public async updateData(isInit?: boolean): Promise<any> {
    const appNode = this.getAppNode();
    const res = await kubectl.getResourceList(
      this.getKubeConfigPath(),
      this.resourceType,
      appNode.namespace
    );
    const list = JSON.parse(res as string) as List;

    const resource = this.filterResource(list.items, appNode);

    state.setData(this.getNodeStateId(), resource, isInit);

    return resource;
  }

  private isOther(
    r: Resource,
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

  public filterResource(resources: Array<Resource>, appNode: AppNode) {
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
