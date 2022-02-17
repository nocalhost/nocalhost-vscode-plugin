import vscode from "vscode";

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
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }
    const appName = node.getAppName();
    await nhctl.resetService(
      node.getKubeConfigPath(),
      node.getNameSpace(),
      appName,
      node.name,
      node.resourceType
    );
    const appNode = node.getAppNode();
    const devSpace = appNode.getParent() as DevSpaceNode;
    host.disposeWorkload(devSpace.info.spaceName, appName, node.name);
    vscode.commands.executeCommand(REFRESH, node);
    host.showInformationMessage(`reset service ${node.name}`);
  }
}
