import * as vscode from "vscode";
import ICommand from "./ICommand";
import registerCommand from "./register";
import { START_COPY_DEV_MODE, START_DEV_MODE } from "./constants";

import { ControllerNodeApi } from "./StartDevModeCommand";

export default class StartCopyDevModeCommand implements ICommand {
  command: string = START_COPY_DEV_MODE;
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }

  async execCommand(node: ControllerNodeApi) {
    vscode.commands.executeCommand(START_DEV_MODE, node, { mode: "copy" });
  }
}
