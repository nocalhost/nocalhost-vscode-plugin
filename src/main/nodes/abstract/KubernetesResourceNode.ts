import * as vscode from "vscode";
import { AppNode } from "../AppNode";
import { DevSpaceNode } from "../DevSpaceNode";
import { ID_SPLIT } from "../nodeContants";
import { IK8sResource } from "./../../domain/IK8sResource";

import { BaseNocalhostNode } from "../types/nodeType";

export abstract class KubernetesResourceNode implements BaseNocalhostNode {
  abstract label: string;
  abstract type: string;
  abstract resourceType: string;
  abstract name: string;
  abstract parent: BaseNocalhostNode;
  resource?: IK8sResource;
  getNodeStateId(): string {
    const parentStateId = this.parent.getNodeStateId();
    return `${parentStateId}${ID_SPLIT}${this.name}`;
  }

  getParent(): BaseNocalhostNode {
    return this.parent;
  }
  getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    return Promise.resolve([]);
  }
  getTreeItem(): vscode.TreeItem | Promise<vscode.TreeItem> {
    let treeItem = new vscode.TreeItem(
      this.label,
      vscode.TreeItemCollapsibleState.None
    );
    treeItem.label = this.label;
    // treeItem.command = {
    //   command: "Nocalhost.loadResource",
    //   title: "loadResource",
    //   arguments: [this],
    // };
    return treeItem;
  }

  public getAppNode(parent?: BaseNocalhostNode): AppNode {
    let node: BaseNocalhostNode | null | undefined;
    if (parent) {
      node = parent.getParent(parent);
    } else {
      node = this.getParent();
    }
    if (node instanceof AppNode) {
      return node;
    } else {
      return this.getAppNode(node as BaseNocalhostNode);
    }
  }

  public get kubeConfigPath() {
    return this.getKubeConfigPath();
  }
  public getKubeConfigPath() {
    const appNode = this.getAppNode();
    return appNode.getKubeConfigPath();
  }

  public get appName() {
    return this.getAppName();
  }
  public getAppName() {
    const appNode = this.getAppNode();
    return appNode.name;
  }

  public getSpaceName() {
    const appNode = this.getAppNode();
    const devspace = appNode.getParent() as DevSpaceNode;
    return devspace.info.spaceName;
  }

  public get namespace() {
    return this.getNameSpace();
  }
  public getNameSpace() {
    const appNode = this.getAppNode();
    const devspace = appNode.getParent() as DevSpaceNode;
    return devspace.info.namespace;
  }

  public getStorageClass() {
    const appNode = this.getAppNode();
    const devspace = appNode.getParent() as DevSpaceNode;
    return devspace.info.storageClass;
  }

  public getDevStartAppendCommand() {
    const appNode = this.getAppNode();
    const devspace = appNode.getParent() as DevSpaceNode;
    const appendCommands = devspace.info.devStartAppendCommand || [];
    return appendCommands.join(" ");
  }

  public async refreshParent() {
    const { parent } = this;

    if (parent) {
      await parent.updateData();

      vscode.commands.executeCommand("Nocalhost.refresh", parent);
    }
  }
}
