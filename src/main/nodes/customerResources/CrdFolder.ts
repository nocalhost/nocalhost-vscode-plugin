import * as vscode from "vscode";
import { BaseNocalhostNode } from "../types/nodeType";
import state from "../../state";
import { NhctlCommand } from "../../ctl/nhctl";
import { KubernetesResourceFolder } from "../abstract/KubernetesResourceFolder";
import { CrdResource } from "../types/resourceType";
import { CrdGroup } from "./CrdGroup";
import { orderBy, sortBy } from "lodash";

export class CrdFolder extends KubernetesResourceFolder {
  public label: string = "CustomResources";
  public type: string = "crd-list";
  public resourceType: string = "crd-list";

  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
    state.setNode(this.getNodeStateId(), this);
  }

  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    const collapseState =
      state.get(this.getNodeStateId()) ||
      vscode.TreeItemCollapsibleState.Collapsed;
    let treeItem = new vscode.TreeItem(this.label, collapseState);
    return treeItem;
  }

  getParent(element?: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }

  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<any>> {
    let data = state.getData(this.getNodeStateId());
    if (!data) {
      data = await this.updateData();
    }
    return data;
  }

  async updateData(): Promise<any> {
    const list: CrdResource[] = (
      (await NhctlCommand.get({
        kubeConfigPath: this.getKubeConfigPath(),
      })
        .addArgument(this.resourceType)
        .addArgument("-o", "json")
        .exec()) || []
    )
      .map(({ info }: { info: CrdResource }) => info)
      .filter((item: CrdResource) => item.Namespaced);
    const groupMap = new Map();
    list.forEach((item: CrdResource) => {
      const kindItem = groupMap.get(item.Group) || [];
      groupMap.set(item.Group, [...kindItem, item]);
    });
    const nodeData = sortBy([...groupMap]).map(
      (item) => new CrdGroup(this, item)
    );
    state.setData(this.getNodeStateId(), nodeData);
    return nodeData;
  }
}
