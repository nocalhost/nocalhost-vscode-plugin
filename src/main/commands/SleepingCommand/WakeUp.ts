import * as vscode from "vscode";
import { WAKE_UP } from "../constants";
import ICommand from "../ICommand";
import registerCommand from "../register";

import { DevSpaceNode } from "../../nodes/DevSpaceNode";

export default class AddKubeconfig implements ICommand {
  command: string = WAKE_UP;

  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }

  async execCommand(node: DevSpaceNode) {
    const spaceId = node.info.spaceId;
    node.parent.accountClusterService.wakeUpSpace(spaceId);
  }
}
