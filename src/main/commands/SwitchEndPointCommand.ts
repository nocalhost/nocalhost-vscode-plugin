import * as vscode from "vscode";

import ICommand from "./ICommand";
import * as fileStore from "../store/fileStore";
import { SWITCH_END_POINT } from "./constants";
import registerCommand from "./register";

import { ControllerResourceNode } from "../nodes/nodeType";
import { BASE_URL } from "../constants";
import host from "../host";

export default class SwitchEndPointCommand implements ICommand {
  command: string = SWITCH_END_POINT;
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand() {
    const value: string = fileStore.get(BASE_URL);
    const options: vscode.InputBoxOptions = {
      placeHolder: "input your api server url",
      ...(value ? { value } : {}),
    };
    const newValue: string | undefined = await host.showInputBox(options);
    if (newValue) {
      fileStore.set(BASE_URL, newValue);
      await vscode.commands.executeCommand("setContext", "serverConfig", true);
      host.showInformationMessage("configured api server");
    }
  }
}
