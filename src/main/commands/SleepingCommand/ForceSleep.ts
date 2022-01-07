import * as vscode from "vscode";
import { FORCE_SLEEP } from "../constants";
import ICommand from "../ICommand";
import registerCommand from "../register";
import host from "../../host";
import AccountClusterService, {
  AccountClusterNode,
} from "../../clusters/AccountCluster";

import { DevSpaceNode } from "../../nodes/DevSpaceNode";

export default class ForceSleep implements ICommand {
  command: string = FORCE_SLEEP;

  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }

  async execCommand(node: DevSpaceNode) {
    // force sleep
    const res = await host.showInformationMessage(
      "Confirm to sleep!",
      { modal: true },
      "yes"
    );

    if (res === "yes") {
      const spaceId = node.info.spaceId;
      const clusterInfo = node.parent?.rootNode?.clusterInfo;
      const service = new AccountClusterService(
        clusterInfo as AccountClusterNode
      );
      service.wakeUpSpace(spaceId);
    }
  }
}
