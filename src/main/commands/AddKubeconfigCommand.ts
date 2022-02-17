import vscode from "vscode";
import { ADD_KUBECONFIG } from "./constants";
import ICommand from "./ICommand";
import registerCommand from "./register";
import host from "../host";

export default class AddKubeconfig implements ICommand {
  command: string = ADD_KUBECONFIG;

  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }

  async execCommand() {
    vscode.commands.executeCommand(
      "setContext",
      "Nocalhost.visibleTree",
      false
    );
  }
}
