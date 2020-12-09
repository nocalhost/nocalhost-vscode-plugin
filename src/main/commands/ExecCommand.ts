import * as vscode from "vscode";

import ICommand from "./ICommand";
import { EXEC } from "./constants";
import registerCommand from "./register";
import { ControllerResourceNode } from "../nodes/nodeType";
import host from "../host";
import nocalhostService from "../service/nocalhostService";

export default class ExecCommand implements ICommand {
  command: string = EXEC;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: ControllerResourceNode) {
    await nocalhostService.exec(host, node);
  }
}
