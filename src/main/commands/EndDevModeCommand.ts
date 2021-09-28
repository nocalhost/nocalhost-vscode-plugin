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
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }
    let result = "Yes";
    const svcProfile = await nhctl.getServiceConfig(
      node.getKubeConfigPath(),
      node.getNameSpace(),
      node.getAppName(),
      node.name,
      node.resourceType
    );
    if (svcProfile.possess === false) {
      result = await vscode.window.showInformationMessage(
        "This service is already in DevMode and you not the initiator, do you want exit the DevMode first?",
        { modal: true },
        "Yes",
        "No"
      );
    }
    if (result !== "Yes") {
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
    await node.getParent().updateData(false);
  }
}
