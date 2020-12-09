import * as vscode from "vscode";

import ICommand from "./ICommand";
import { SIGN_OUT } from "./constants";
import registerCommand from "./register";
import state from "../state";
import { JWT, EMAIL } from "../constants";
import * as fileStore from "../store/fileStore";

export default class SignOutCommand implements ICommand {
  command: string = SIGN_OUT;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand() {
    fileStore.remove(JWT);
    fileStore.remove(EMAIL);
    state.setLogin(false);
  }
}
