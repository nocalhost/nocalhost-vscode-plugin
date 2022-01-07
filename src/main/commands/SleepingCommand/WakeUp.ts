import * as vscode from "vscode";
import { WAKE_UP } from "../constants";
import ICommand from "../ICommand";
import registerCommand from "../register";

import { DevSpaceNode } from "../../nodes/DevSpaceNode";
import AccountClusterService, {
  AccountClusterNode,
} from "../../clusters/AccountCluster";

export default class WakeUp implements ICommand {
  command: string = WAKE_UP;

  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }

  async execCommand(node: DevSpaceNode) {
    const spaceId = node.info.spaceId;
    const clusterInfo = node.parent?.rootNode?.clusterInfo;

    const service = new AccountClusterService(
      clusterInfo as AccountClusterNode
    );
    service.wakeUpSpace(spaceId);
    console.log(spaceId);
  }
}
