import * as vscode from "vscode";

import ICommand from "./ICommand";
import { LOG } from "./constants";
import registerCommand from "./register";
import { KubernetesResourceNode } from "../nodes/nodeType";
import host from "../host";
import { SELECTED_APP_NAME } from "../constants";
import nocalhostService from "../service/nocalhostService";
import * as fileStore from "../store/fileStore";

export default class LogCommand implements ICommand {
  command: string = LOG;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: KubernetesResourceNode) {
    const kind = node.resourceType;
    const name = node.name;
    const appName = fileStore.get(SELECTED_APP_NAME);
    await nocalhostService.log(host, appName, kind, name);
  }
}
