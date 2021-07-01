import * as vscode from "vscode";

import ICommand from "./ICommand";
import { LOCAL_PATH } from "../constants";
import { LocalClusterNode } from "../clusters/LocalCuster";

import { RENAME } from "./constants";
import registerCommand from "./register";
import { KubeConfigNode } from "../nodes/KubeConfigNode";
import host from "../host";

function validateInputNickName(value: string) {
  if (!value || value.length < 2) {
    return "The minimm length is 2";
  }
  return null;
}

export default class ResetCommand implements ICommand {
  command: string = RENAME;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: KubeConfigNode) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }

    const clusterName = await vscode.window.showInputBox({
      value: node.label,
      validateInput: validateInputNickName,
    });

    if (!clusterName) {
      return;
    }

    const localClusterNodes =
      (host.getGlobalState(LOCAL_PATH) as LocalClusterNode[]) || [];

    const kubeConfigPath = node.getKubeConfigPath();

    (localClusterNodes || []).forEach((it) => {
      if (it.filePath === kubeConfigPath) {
        it.clusterNickName = clusterName;
      }
    });

    host.setGlobalState(LOCAL_PATH, localClusterNodes);

    node.label = clusterName;
    await vscode.commands.executeCommand("Nocalhost.refresh", node);
  }
}
