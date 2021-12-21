import * as vscode from "vscode";
import { vpn } from "../../ctl/nhctl";

import { ControllerResourceNode } from "../../nodes/workloads/controllerResources/ControllerResourceNode";
import ICommand from "../ICommand";
import registerCommand from "../register";

export default class EndProxyModeCommand implements ICommand {
  command: string = "Nocalhost.endProxyMode";
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: ControllerResourceNode) {
    await vpn({
      subCommand: "disconnect",
      baseParam: node,
      workLoadName: node.name,
      workLoadType: node.resourceType,
    });

    await node.refreshParent();
  }
}
