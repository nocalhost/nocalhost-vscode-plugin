import state from "../../../state";
import { KubernetesResourceNode } from "../../abstract/KubernetesResourceNode";
import { CONFIG_MAP } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";

export class ConfigMap extends KubernetesResourceNode {
  type = CONFIG_MAP;
  public resourceType = "configMap";
  constructor(
    public parent: BaseNocalhostNode,
    public label: string,
    public name: string,
    public info?: any
  ) {
    super();
    this.parent = parent;
    this.label = label;
    this.info = info;
    this.name = name;
    state.setNode(this.getNodeStateId(), this);
  }
}
