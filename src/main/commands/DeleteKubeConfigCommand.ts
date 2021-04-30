import * as vscode from "vscode";

import ICommand from "./ICommand";
import { DELETE_KUBECONFIG, REFRESH, SIGN_OUT } from "./constants";
import registerCommand from "./register";
import { LOCAL_PATH } from "../constants";
import host from "../host";
import { KubeConfigNode } from "../nodes/KubeConfigNode";

export default class DeleteKubeConfigCommand implements ICommand {
  command: string = DELETE_KUBECONFIG;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: KubeConfigNode) {
    const localPaths = host.getGlobalState(LOCAL_PATH) as string[];
    const kubeConfigPath = node.getKubeConfigPath();
    const index = localPaths.indexOf(kubeConfigPath);
    if (index < 0) {
      return;
    }
    let tmpPath = [...localPaths];
    if (localPaths.length > 1) {
      tmpPath = localPaths.splice(index - 1, 1);
    } else {
      tmpPath = [];
    }
    host.setGlobalState(LOCAL_PATH, tmpPath);
    if (tmpPath.length === 0) {
      await vscode.commands.executeCommand(SIGN_OUT);
    } else {
      await vscode.commands.executeCommand(REFRESH);
    }
  }
}
