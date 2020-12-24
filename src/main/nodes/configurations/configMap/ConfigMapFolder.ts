import * as vscode from "vscode";

import * as kubectl from "../../../ctl/kubectl";
import { KubernetesResourceFolder } from "../../abstract/KubernetesResourceFolder";
import { CONFIG_MAP_FOLDER } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { List } from "../../types/resourceType";
import { ConfigMap } from "./ConfigMap";

export class ConfigMapFolder extends KubernetesResourceFolder {
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
  }
  public label: string = "ConfigMaps";
  public type = CONFIG_MAP_FOLDER;

  getParent(): BaseNocalhostNode {
    return this.parent;
  }
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<BaseNocalhostNode[]>> {
    const res = await kubectl.getResourceList(
      this.getKubeConfigPath(),
      "ConfigMaps"
    );
    const list = JSON.parse(res as string) as List;
    const result: ConfigMap[] = list.items.map(
      (item) =>
        new ConfigMap(this, item.metadata.name, item.metadata.name, item)
    );
    return result;
  }
}
