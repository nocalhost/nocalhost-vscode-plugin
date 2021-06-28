import * as vscode from "vscode";

import ICommand from "./ICommand";
import { SWITCH_END_POINT } from "./constants";
import registerCommand from "./register";

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
    const value: string = host.getGlobalState(BASE_URL);
    const options: vscode.InputBoxOptions = {
      placeHolder: "input your api server url",
      ...(value ? { value } : {}),
    };
    const newValue: string | undefined = await host.showInputBox(options);
    if (newValue) {
      host.setGlobalState(BASE_URL, newValue);
      host.showInformationMessage("configured api server");
    }
  }
}
