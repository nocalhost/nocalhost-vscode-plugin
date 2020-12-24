import * as vscode from "vscode";
import state from "../../state";
import { NocalhostFolderNode } from "../abstract/NocalhostFolderNode";
import { CONFIGURATION_FOLDER } from "../nodeContants";
import { BaseNocalhostNode } from "../types/nodeType";
import { ConfigMapFolder } from "./configMap/ConfigMapFolder";
import { HPAFolder } from "./hpa/HpaFolder";
import { PodDisruptionBudgetFolder } from "./PodDisruptionBudget/PodDisruptionBudgetFolder";
import { ResourceQuotaFolder } from "./resourceQuota/ResourceQuotaFolder";
import { SecretFolder } from "./secret/SecretFolder";

export class ConfigurationFolderNode extends NocalhostFolderNode {
  public parent: BaseNocalhostNode;
  public label: string = "Configurations";
  public type = CONFIGURATION_FOLDER;
  private children = [
    "ConfigMaps",
    "Secrets",
    "HPA",
    "ResourceQuota",
    "PodDisruptionBudget",
  ];

  constructor(parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
  }
  getParent(): BaseNocalhostNode {
    return this.parent;
  }
  getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    return Promise.resolve(this.children.map((type) => this.createChild(type)));
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    const collapseState =
      state.get(this.getNodeStateId()) ||
      vscode.TreeItemCollapsibleState.Collapsed;
    let treeItem = new vscode.TreeItem(this.label, collapseState);
    return treeItem;
  }

  createChild(type: string): BaseNocalhostNode {
    let node: BaseNocalhostNode;
    switch (type) {
      case "ConfigMaps":
        node = new ConfigMapFolder(this);
        break;
      case "Secrets":
        node = new SecretFolder(this);
        break;
      case "HPA":
        node = new HPAFolder(this);
        break;
      case "ResourceQuota":
        node = new ResourceQuotaFolder(this);
        break;
      case "PodDisruptionBudget":
        node = new PodDisruptionBudgetFolder(this);
        break;
      default:
        throw new Error("not implement the resource");
    }

    return node;
  }
}
