import * as vscode from "vscode";
import ICommand from "./ICommand";
import registerCommand from "./register";
import { END_COPY_DEV_MODE, END_DEV_MODE } from "./constants";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";

export default class EndCopyDevModeCommand implements ICommand {
  command: string = END_COPY_DEV_MODE;

  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }

  async execCommand(node: ControllerResourceNode) {
    vscode.commands.executeCommand(END_DEV_MODE, node, "copy");
  }
}
