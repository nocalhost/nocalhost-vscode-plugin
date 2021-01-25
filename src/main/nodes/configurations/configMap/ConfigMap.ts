import state from "../../../state";
import { ConfigurationResourceNode } from "../ConfigurationResourceNode";
import { CONFIG_MAP } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";

export class ConfigMap extends ConfigurationResourceNode {
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
