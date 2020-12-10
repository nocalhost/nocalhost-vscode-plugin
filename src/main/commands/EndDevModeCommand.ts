import * as vscode from "vscode";

import ICommand from "./ICommand";
import * as fileStore from "../store/fileStore";
import { END_DEV_MODE } from "./constants";
import registerCommand from "./register";

import { SELECTED_APP_NAME } from "../constants";
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
    const appName = fileStore.get(SELECTED_APP_NAME);
    if (!appName) {
      throw new Error("you must select one app");
    }
    host.getOutputChannel().show(true);
    host.showInformationMessage("Ending DevMode.");
    host.log("Ending DevMode ...", true);
    await nhctl.endDevMode(host, node.getKubeConfigPath(), appName, node.name);
    await node.setStatus("", true);
    host.showInformationMessage("DevMode Ended.");
    host.log("DevMode Ended", true);
  }
}
