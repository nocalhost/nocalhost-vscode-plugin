import * as vscode from "vscode";
import { ADD_KUBECONFIG } from "./constants";

import ICommand from "./ICommand";
import registerCommand from "./register";

export default class HomeWebViewCommand implements ICommand {
  command: string = "Nocalhost.homeWebView";
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(args?: any) {
    await vscode.commands.executeCommand(ADD_KUBECONFIG);

    const { command, data } = args;
    vscode.commands.executeCommand(command, data);
  }
}
