import * as vscode from "vscode";

import ICommand from "./ICommand";
import * as fileStore from "../store/fileStore";
import { END_DEV_MODE } from "./constants";
import registerCommand from "./register";

import { ControllerResourceNode } from "../nodes/nodeType";
import { SELECTED_APP_NAME } from "../constants";
import nocalhostService from "../service/nocalhostService";
import host from "../host";

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
    // TODO remove nocalhostService
    await nocalhostService.endDevMode(host, appName, node);
  }
}
