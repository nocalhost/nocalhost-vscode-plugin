import * as vscode from "vscode";
import { vpn } from "../../ctl/nhctl";
import { ControllerResourceNode } from "../../nodes/workloads/controllerResources/ControllerResourceNode";

import ICommand from "../ICommand";
import registerCommand from "../register";

export default class StartProxyModeCommand implements ICommand {
  command: string = "Nocalhost.startProxyMode";
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: ControllerResourceNode) {
    await vpn({
      subCommand: "connect",
      baseParam: node,
      workLoadName: node.name,
      workLoadType: node.resourceType,
    });

    await node.refreshParent();
  }
}
