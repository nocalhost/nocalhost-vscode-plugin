import * as vscode from "vscode";
import { CLUSTERS_VIEW } from "./constants";
import ICommand from "./ICommand";
import registerCommand from "./register";

export default class ClustersView implements ICommand {
  command: string = CLUSTERS_VIEW;

  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }

  async execCommand() {
    vscode.commands.executeCommand("setContext", "Nocalhost.visibleTree", true);
  }
}
