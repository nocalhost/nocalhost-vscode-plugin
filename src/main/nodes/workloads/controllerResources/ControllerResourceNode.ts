import * as vscode from "vscode";

import state from "../../../state";
import { KubernetesResourceNode } from "../../abstract/KubernetesResourceNode";

export abstract class ControllerResourceNode extends KubernetesResourceNode {
  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    treeItem.contextValue = `workload-${this.resourceType}`;
    return treeItem;
  }

  public getStatus(): string | Promise<string> {
    const appNode = this.getAppNode();
    const status = state.getAppState(
      appNode.name,
      `${this.getNodeStateId()}_status`
    );
    return status;
  }

  /**
   *
   * @param status
   * @param fresh Refresh dependencies
   */
  public async setStatus(status: string) {
    const appNode = this.getAppNode();
    if (status) {
      await state.setAppState(
        appNode.name,
        `${this.getNodeStateId()}_status`,
        status,
        {
          refresh: true,
          nodeStateId: this.getNodeStateId(),
        }
      );
    } else {
      await state.deleteAppState(
        appNode.name,
        `${this.getNodeStateId()}_status`,
        {
          refresh: true,
          nodeStateId: this.getNodeStateId(),
        }
      );
    }
  }

  public async getContainer() {
    const appNode = this.getAppNode();
    const status = state.getAppState(
      appNode.name,
      `${this.getNodeStateId()}_container`
    );
    return status;
  }

  public async setContainer(container: string) {
    const appNode = this.getAppNode();
    if (container) {
      await state.setAppState(
        appNode.name,
        `${this.getNodeStateId()}_container`,
        container,
        {
          refresh: true,
          nodeStateId: this.getNodeStateId(),
        }
      );
    } else {
      await state.deleteAppState(
        appNode.name,
        `${this.getNodeStateId()}_container`,
        {
          refresh: true,
          nodeStateId: this.getNodeStateId(),
        }
      );
    }
  }

  public checkConfig() {
    return Promise.resolve(true);
  }
}
