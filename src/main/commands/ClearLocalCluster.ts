import * as vscode from "vscode";
import ICommand from "./ICommand";
import { LOCAL_PATH, SERVER_CLUSTER_LIST } from "../constants";
import { CLEAR_LOCAL_CLUSTER } from "./constants";
import host from "../host";
import registerCommand from "./register";

export default class ClearLocalCluster implements ICommand {
  command: string = CLEAR_LOCAL_CLUSTER;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand() {
    host.setGlobalState(LOCAL_PATH, []);
    host.setGlobalState(SERVER_CLUSTER_LIST, []);
  }
}
