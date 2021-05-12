import * as vscode from "vscode";
import { IS_LOCAL, LOCAL_PATH } from "../constants";
import host from "../host";
import { ADD_KUBECONFIG } from "./constants";
import ICommand from "./ICommand";
import registerCommand from "./register";

export default class AddKubeconfig implements ICommand {
  command: string = ADD_KUBECONFIG;

  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }

  async execCommand() {
    // remove local
    host.removeGlobalState(IS_LOCAL);
    host.removeGlobalState(LOCAL_PATH);
    await vscode.commands.executeCommand("setContext", "local", false);
  }
}
