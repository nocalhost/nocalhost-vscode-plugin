import * as vscode from "vscode";

import ICommand from "./ICommand";
import { SIGN_OUT } from "./constants";
import registerCommand from "./register";
import state from "../state";
import { JWT, EMAIL, KUBE_CONFIG_DIR } from "../constants";
import host from "../host";
import * as fs from "fs";

export default class SignOutCommand implements ICommand {
  command: string = SIGN_OUT;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand() {
    host.removeGlobalState(JWT);
    host.removeGlobalState(EMAIL);
    // remove kubeconfig
    this.removeAllKubeconfig();
    state.setLogin(false);
  }

  async removeAllKubeconfig() {
    KUBE_CONFIG_DIR;
    fs.rmdirSync(KUBE_CONFIG_DIR, { recursive: true });
    fs.mkdirSync(KUBE_CONFIG_DIR);
  }
}
