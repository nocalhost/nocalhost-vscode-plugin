import * as vscode from "vscode";
import * as fs from "fs";
import { orderBy } from "lodash";
import { getResourceList } from "../../../../ctl/nhctl";
import ConfigService, {
  NocalhostConfig,
  NocalhostServiceConfig,
} from "../../../../service/configService";
import state from "../../../../state";
import { KubernetesResourceFolder } from "../../../abstract/KubernetesResourceFolder";
import { DEPLOYMENT_FOLDER } from "../../../nodeContants";
import { BaseNocalhostNode } from "../../../types/nodeType";
import { kubernetesResourceDevMode } from "../../KubernetesResourceDevMode";
import { Deployment } from "./Deployment";

@kubernetesResourceDevMode(Deployment)
export class DeploymentFolder extends KubernetesResourceFolder {
  public resourceType = "Deployments";
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
    state.setNode(this.getNodeStateId(), this);
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  public label: string = "Deployments";
  public type: string = DEPLOYMENT_FOLDER;

  // TODO: DO NOT DELETE, FOR: [webview integration]

  // getTreeItem(): vscode.TreeItem | Promise<vscode.TreeItem> {
  //   let treeItem = new vscode.TreeItem(
  //     this.label,
  //     vscode.TreeItemCollapsibleState.None
  //   );
  //   treeItem.label = this.label;
  //   treeItem.command = {
  //     command: "Nocalhost.loadWorkloads",
  //     title: "loadWorkloads",
  //     arguments: [this],
  //   };
  //   return treeItem;
  // }
}
