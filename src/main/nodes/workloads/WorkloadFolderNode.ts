import * as vscode from "vscode";

import state from "../../state";
import { NocalhostFolderNode } from "../abstract/NocalhostFolderNode";
import { WORKLOAD_FOLDER } from "../nodeContants";
import { PodFolder } from "./pod/PodFolder";
import { BaseNocalhostNode } from "../types/nodeType";
import { DeploymentFolder } from "./controllerResources/deployment/DeploymentFolder";
import { JobFolder } from "./controllerResources/job/JobFolder";
import { DaemonSetFolder } from "./controllerResources/daemonSet/DaemonSetFolder";
import { StatefulSetFolder } from "./controllerResources/statefulSet/StatefulSetFolder";
import { CronJobFolder } from "./controllerResources/cronJob/CronJobFolder";

export class WorkloadFolderNode extends NocalhostFolderNode {
  public label: string = "Workloads";
  public type = WORKLOAD_FOLDER;
  private children = [
    "Deployments",
    "StatefuleSets",
    "DaemonSets",
    "Jobs",
    "CronJobs",
    "Pods",
  ];

  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
  }

  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<NocalhostFolderNode[]>> {
    return Promise.resolve(this.children.map((type) => this.createChild(type)));
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    const collapseState =
      state.get(this.getNodeStateId()) ||
      vscode.TreeItemCollapsibleState.Collapsed;
    let treeItem = new vscode.TreeItem(this.label, collapseState);
    return treeItem;
  }

  createChild(type: string) {
    let node: NocalhostFolderNode;
    switch (type) {
      case "Deployments":
        node = new DeploymentFolder(this);
        break;
      case "StatefuleSets":
        node = new StatefulSetFolder(this);
        break;
      case "DaemonSets":
        node = new DaemonSetFolder(this);
        break;
      case "Jobs":
        node = new JobFolder(this);
        break;
      case "CronJobs":
        node = new CronJobFolder(this);
        break;
      case "Pods":
        node = new PodFolder(this);
        break;
      default:
        throw new Error("not implement the resource");
    }

    return node;
  }
}
