import vscode from "vscode";
import ICommand from "./ICommand";
import { LOCAL_PATH } from "../constants";
import { SHOW_CONTEXT_GLOBAL } from "./constants";
import Host from "../host";
import registerCommand from "./register";

export default class ClearLocalCluster implements ICommand {
  command: string = SHOW_CONTEXT_GLOBAL;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand() {
    await Host.removeGlobalState(LOCAL_PATH);
  }
}
