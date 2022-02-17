import vscode from "vscode";
import fs from "fs";
import ICommand from "./ICommand";
import { SERVER_CLUSTER_LIST } from "../constants";
import { CLEAR_SERVER_CLUSTER } from "./constants";
import host from "../host";
import registerCommand from "./register";

export default class ClearLocalCluster implements ICommand {
  command: string = CLEAR_SERVER_CLUSTER;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand() {
    host.setGlobalState(SERVER_CLUSTER_LIST, []);
  }
}
