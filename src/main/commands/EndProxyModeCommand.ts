import * as vscode from "vscode";

import ICommand from "./ICommand";
import registerCommand from "./register";

export default class EndProxyModeCommand implements ICommand {
  command: string = "Nocalhost.endProxyMode";
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand() {}
}
