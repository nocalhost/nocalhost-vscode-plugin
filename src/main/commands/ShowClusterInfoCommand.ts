import * as vscode from "vscode";

import ICommand from "./ICommand";
import { SHOW_CLUSTER_INFO } from "./constants";
import { LOCAL_PATH, SERVER_CLUSTER_LIST } from "../constants";
import registerCommand from "./register";
import host from "../host";
import { DevSpaceNode } from "../nodes/DevSpaceNode";

export default class ShowClusterInfoCommand implements ICommand {
  command: string = SHOW_CLUSTER_INFO;
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: DevSpaceNode) {
    const localClusterNodes = host.getGlobalState(LOCAL_PATH) || [];
    const globalAccountClusterList = host.getGlobalState(SERVER_CLUSTER_LIST);

    host.log(JSON.stringify(localClusterNodes, null, 2), true);
    host.log(JSON.stringify(globalAccountClusterList, null, 2), true);
  }
}
