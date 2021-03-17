import state from "../../state";
import * as vscode from "vscode";

import * as kubectl from "../../ctl/kubectl";
import { NocalhostFolderNode } from "./NocalhostFolderNode";
import { AppNode } from "../AppNode";
import { BaseNocalhostNode } from "../types/nodeType";
import { List } from "../types/resourceType";

export abstract class KubernetesResourceFolder extends NocalhostFolderNode {
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
    const res = await kubectl.getResourceList(
      this.getKubeConfigPath(),
      this.resourceType
    );
    const list = JSON.parse(res as string) as List;

    const appNode = this.getAppNode();

    const resource = list.items.filter((r) => {
      if (
        r.metadata &&
        r.metadata["annotations"] &&
        r.metadata["annotations"]["meta.nocalhost.sh/release-name"] ===
          appNode.name
      ) {
        return true;
      }
      if (
        !(
          r.metadata &&
          r.metadata["annotations"] &&
          r.metadata["annotations"]["meta.nocalhost.sh/release-name"]
        ) &&
        appNode.name === "other"
      ) {
        return true;
      }
    });

    state.setData(this.getNodeStateId(), resource, isInit);

    return resource;
  }
}
