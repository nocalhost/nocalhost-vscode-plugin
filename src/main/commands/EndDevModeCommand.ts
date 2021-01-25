import * as vscode from "vscode";

import ICommand from "./ICommand";
import { END_DEV_MODE, SYNC_SERVICE } from "./constants";
import registerCommand from "./register";
import host from "../host";
import * as nhctl from "../ctl/nhctl";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";

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
    host.showInformationMessage("Ending DevMode.");
    host.log("Ending DevMode ...", true);
    await nhctl.endDevMode(
      host,
      node.getKubeConfigPath(),
      appNode.name,
      node.name
    );
    await node.setStatus("");
    host.showInformationMessage("DevMode Ended.");
    vscode.commands.executeCommand(SYNC_SERVICE, {});
    host.log("DevMode Ended", true);
  }
}
