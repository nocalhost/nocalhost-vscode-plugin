import * as vscode from "vscode";

import ICommand from "./ICommand";
import { SIGN_IN } from "./constants";
import registerCommand from "./register";
import { login, getUserinfo } from "../api";
import state from "../state";
import host from "../host";
import { BASE_URL } from "../constants";

interface LoginInfo {
  username: string;
  password: string;
  baseUrl: string;
}

export default class SignInCommand implements ICommand {
  command: string = SIGN_IN;
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(info: LoginInfo) {
    if (state.isLogin()) {
      vscode.window.showInformationMessage("Logined");
      return;
    }
    // const email: string | undefined = await vscode.window.showInputBox({
    //   placeHolder: "please input your email",
    // });
    // if (!email) {
    //   return;
    // }

    // const password: string | undefined = await vscode.window.showInputBox({
    //   placeHolder: "please input password",
    //   password: true,
    // });
    // if (!password) {
    //   return;
    // }

    host.setGlobalState(BASE_URL, info.baseUrl);
    await vscode.commands.executeCommand("setContext", "serverConfig", true);

    host.showProgressing("Logging in ...", async () => {
      try {
        await login({ email: info.username, password: info.password });
        await getUserinfo();
        await state.setLogin(true);
        vscode.window.showInformationMessage("login successful");
      } catch (e) {
        vscode.window.showWarningMessage(e && e.error && e.error.message);
      }
    });
  }
}
