import * as vscode from "vscode";
import host from "../../host";

import ICommand from "../ICommand";
import registerCommand from "../register";
import { ControllerResourceNode } from "../../nodes/workloads/controllerResources/ControllerResourceNode";
import { vpn } from "../../ctl/nhctl";

export default class ResumeProxyModeCommand implements ICommand {
  command: string = "Nocalhost.resumeProxyMode";
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: ControllerResourceNode) {
    await vpn({
      subCommand: "reconnect",
      baseParam: node,
      workLoadName: node.name,
      workLoadType: node.resourceType,
    });

    await node.refreshParent();
  }
}
