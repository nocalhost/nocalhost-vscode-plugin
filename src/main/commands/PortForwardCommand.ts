import * as vscode from "vscode";

import ICommand from "./ICommand";
import { PORT_FORWARD } from "./constants";
import registerCommand from "./register";
import { KubernetesResourceNode } from "../nodes/nodeType";
import host from "../host";
import nocalhostService from "../service/nocalhostService";

export default class PortForwardCommand implements ICommand {
  command: string = PORT_FORWARD;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: KubernetesResourceNode) {
    const kind = node.resourceType;
    const name = node.name;
    await nocalhostService.portForward(host, kind, name);
  }
}
