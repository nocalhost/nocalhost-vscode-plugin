import * as vscode from "vscode";

import ICommand from "./ICommand";

import { SWITCH_ASSOCIATE } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { AssociateNode } from "../component/syncManage/node";

export default class SwitchAssociateCommand implements ICommand {
  command: string = SWITCH_ASSOCIATE;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: AssociateNode) {
    if (!node) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }
  }
}
