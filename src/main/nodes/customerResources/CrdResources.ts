import vscode from "vscode";
import { ControllerResourceNode } from "../workloads/controllerResources/ControllerResourceNode";
import logger from "../../utils/logger";

import { BaseNocalhostNode, SvcProfile } from "../types/nodeType";
import { IK8sResource, IStatus } from "../../domain/IK8sResource";

export class CrdResources extends ControllerResourceNode {
  public type = "CRD_RESOURCES";
  public resourceType: string;

  constructor(
    public parent: BaseNocalhostNode,
    public resource: IK8sResource,
    public conditionsStatus?: Array<IStatus> | string,
    public svcProfile?: SvcProfile | undefined | null
  ) {
    super(parent, resource, conditionsStatus, svcProfile);
    this.resourceType = this.parent.resourceType;
  }

  async getTreeItem(): Promise<vscode.TreeItem> {
    let treeItem = await super.getTreeItem();
    let status = "";
    try {
      status = await this.getStatus();
      const [icon, label, mode] = await this.getIconAndLabelByStatus(status);
      treeItem.iconPath = icon;
      treeItem.label = label;
      treeItem.contextValue = `workload-crd-resources-dev-${status}-${mode}`;
    } catch (e) {
      logger.error("crd-resources getTreeItem");
      logger.error(e);
    }

    return treeItem;
  }
}
