import * as vscode from "vscode";

import ICommand from "./ICommand";

import * as nhctl from "../ctl/nhctl";
import { REFRESH, RESET } from "./constants";
import registerCommand from "./register";
import { Deployment } from "../nodes/workloads/controllerResources/deployment/Deployment";
import host from "../host";
import { DevSpaceNode } from "../nodes/DevSpaceNode";

export default class ResetCommand implements ICommand {
  command: string = RESET;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: Deployment) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    const appName = node.getAppName();
    await nhctl.resetService(node.getKubeConfigPath(), appName, node.name);
    const appNode = node.getAppNode();
    const devspace = appNode.getParent() as DevSpaceNode;
    host.disposeWorkload(devspace.info.spaceName, appName, node.name);
    vscode.commands.executeCommand(REFRESH, node);
    host.showInformationMessage(`reset service ${node.name}`);
  }
}
