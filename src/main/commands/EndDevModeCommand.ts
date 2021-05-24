import * as vscode from "vscode";

import ICommand from "./ICommand";
import { END_DEV_MODE } from "./constants";
import registerCommand from "./register";
import host from "../host";
import * as nhctl from "../ctl/nhctl";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import { DevSpaceNode } from "../nodes/DevSpaceNode";
import messageBus from "../utils/messageBus";

export default class EndDevModeCommand implements ICommand {
  command: string = END_DEV_MODE;
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    registerCommand(context, this.command, true, this.execCommand.bind(this));
  }
  async execCommand(node: ControllerResourceNode) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    const appNode = node.getAppNode();
    host.getOutputChannel().show(true);
    const devspace = appNode.getParent() as DevSpaceNode;
    host.disposeWorkload(devspace.info.spaceName, appNode.name, node.name);
    messageBus.emit("endDevMode", {
      devspaceName: devspace.info.spaceName,
      appName: appNode.name,
      workloadName: node.name,
    });
    await nhctl.endDevMode(
      host,
      node.getKubeConfigPath(),
      node.getNameSpace(),
      appNode.name,
      node.name,
      node.resourceType
    );
    await node.setStatus("");
    await node.setContainer("");
  }
}
