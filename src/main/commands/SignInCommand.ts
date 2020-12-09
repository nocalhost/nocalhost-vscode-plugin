import * as vscode from "vscode";

import ICommand from "./ICommand";
import { SIGN_IN } from "./constants";
import registerCommand from "./register";
import { login, getUserinfo } from "../api";
import state from "../state";

export default class SignInCommand implements ICommand {
  command: string = SIGN_IN;
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand() {
    if (state.isLogin()) {
      vscode.window.showInformationMessage("Logined");
      return;
    }
    const email: string | undefined = await vscode.window.showInputBox({
      placeHolder: "please input your email",
    });
    if (!email) {
      return;
    }

    const password: string | undefined = await vscode.window.showInputBox({
      placeHolder: "please input password",
      password: true,
    });
    if (!password) {
      return;
    }

    try {
      await login({ email, password });
      await getUserinfo();
      await state.setLogin(true);
      vscode.window.showInformationMessage("login successful");
    } catch (e) {
      vscode.window.showWarningMessage(e.message);
    }
  }
}
