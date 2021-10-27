import * as vscode from "vscode";
import ICommand from "./ICommand";
import { WRITE_SERVICE_CONFIG, EDIT_SERVICE_CONFIG } from "./constants";
import registerCommand from "./register";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";

export default class WriteServiceConfigCommand implements ICommand {
  command: string = WRITE_SERVICE_CONFIG;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: ControllerResourceNode) {
    vscode.commands.executeCommand(EDIT_SERVICE_CONFIG, node);
  }
}
