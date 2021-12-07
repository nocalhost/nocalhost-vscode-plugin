import * as vscode from "vscode";
import { FORCE_SLEEP } from "../constants";
import ICommand from "../ICommand";
import registerCommand from "../register";
import host from "../../host";

import { DevSpaceNode } from "../../nodes/DevSpaceNode";

export default class AddKubeconfig implements ICommand {
  command: string = FORCE_SLEEP;

  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }

  async execCommand(node: DevSpaceNode) {
    // force sleep
    const spaceId = node.info.spaceId;
    node.parent.accountClusterService.sleepSpace(spaceId);
  }
}
