import * as vscode from "vscode";
import ICommand from "./ICommand";
import registerCommand from "./register";
import { START_MESH_DEV_MODE, START_DEV_MODE } from "./constants";

import { ControllerNodeApi } from "./StartDevModeCommand";

const validateInput = (value: string): string | Thenable<string> => {
  const reg = /\w+=\w+/;
  const match = reg.exec(value);
  if (!match) {
    return "please input correct string; example: foo=bar";
  }
  return "";
};

export default class StartMeshDevModeCommand implements ICommand {
  command: string = START_MESH_DEV_MODE;
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }

  async execCommand(node: ControllerNodeApi) {
    const header = await vscode.window.showInputBox({
      placeHolder: "Please input header, eg: foo=bar",
      validateInput,
    });

    if (header) {
      vscode.commands.executeCommand(START_DEV_MODE, node, {
        mode: "copy",
        header,
      });
    }
  }
}
