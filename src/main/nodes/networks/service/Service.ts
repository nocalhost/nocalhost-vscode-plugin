import { TreeItem } from "vscode";
import { VPN } from "../../../domain";
import state from "../../../state";
import { resolveVSCodeUri } from "../../../utils/fileUtil";
import { SERVICE } from "../../nodeContants";
import { BaseNocalhostNode } from "../../types/nodeType";
import { NetworkResourceNode } from "../NetworkResourceNode";

export class Service extends NetworkResourceNode {
  type = SERVICE;
  public resourceType = "Service";
  constructor(
    public parent: BaseNocalhostNode,
    public label: string,
    public name: string,
    public info?: any,
    public vpn?: VPN
  ) {
    super();
    this.parent = parent;
    this.label = label;
    this.info = info;
    this.name = name;
    state.setNode(this.getNodeStateId(), this);
  }
  async getTreeItem(): Promise<TreeItem> {
    const treeItem = await super.getTreeItem();
    const { vpn } = this;

    let status: string = "";

    if (vpn) {
      let vpnStatus: string = "unhealthy";

      if (!vpn.belongsToMe) {
        vpnStatus = "other";
      } else if (vpn.status === "healthy") {
        vpnStatus = vpn.status;
      }

      status = "vpn_" + vpnStatus;

      treeItem.iconPath = resolveVSCodeUri(`${status}.svg`);
    }

    treeItem.contextValue += "-" + status;

    return treeItem;
  }
}
