import vscode from "vscode";
import state from "../../state";
import { NocalhostFolderNode } from "../abstract/NocalhostFolderNode";
import { NETWORK_FOLDER } from "../nodeContants";
import { BaseNocalhostNode } from "../types/nodeType";
import { EndpointFolder } from "./endpoints/EndpointFolder";
import { IngressFolder } from "./ingresses/IngressFolder";
import { NetworkPolicyFolder } from "./networkPolicies/NetworkPolicyFolder";
import { ServiceFolder } from "./service/ServiceFolder";

export class NetworkFolderNode extends NocalhostFolderNode {
  public parent: BaseNocalhostNode;
  public label: string = "Networks";
  public type = NETWORK_FOLDER;
  private children = ["Services", "Endpoints", "Ingresses", "NetworkPolicies"];

  constructor(parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
  }
  getParent(): BaseNocalhostNode {
    return this.parent;
  }
  getChildren(parent?: BaseNocalhostNode): Promise<BaseNocalhostNode[]> {
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
    let node;
    switch (type) {
      case "Services":
        node = new ServiceFolder(this);
        break;
      case "Endpoints":
        node = new EndpointFolder(this);
        break;
      case "Ingresses":
        node = new IngressFolder(this);
        break;
      case "NetworkPolicies":
        node = new NetworkPolicyFolder(this);
        break;
      default:
        throw new Error("not implement the resource");
    }

    return node;
  }
}
