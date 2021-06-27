import * as vscode from "vscode";
import { getResourceList } from "../../../../ctl/nhctl";
import ConfigService, {
  NocalhostConfig,
  NocalhostServiceConfig,
} from "../../../../service/configService";
import state from "../../../../state";
import { KubernetesResourceFolder } from "../../../abstract/KubernetesResourceFolder";
import { STATEFUL_SET_FOLDER } from "../../../nodeContants";
import {
  AppInfo,
  BaseNocalhostNode,
  SvcProfile,
} from "../../../types/nodeType";
import { List, Resource, ResourceStatus } from "../../../types/resourceType";
import { StatefulSet } from "./StatefulSet";
import { kubernetesResourceDevMode } from "../../KubernetesResourceDevMode";

@kubernetesResourceDevMode(StatefulSet)
export class StatefulSetFolder extends KubernetesResourceFolder {
  public resourceType: string = "StatefulSets";
  public label: string = "StatefulSets";
  public type: string = STATEFUL_SET_FOLDER;
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
    state.setNode(this.getNodeStateId(), this);
  }

  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
}
