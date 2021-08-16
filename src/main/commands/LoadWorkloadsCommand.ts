import * as vscode from "vscode";
import ICommand from "./ICommand";
import { LOAD_WORKLOADS } from "./constants";
import registerCommand from "./register";
import host from "../host";
import NocalhostWebviewPanel from "../webview/NocalhostWebviewPanel";
import { DeploymentFolder } from "../nodes/workloads/controllerResources/deployment/DeploymentFolder";

export default class LoadWorkloadsCommand implements ICommand {
  command: string = LOAD_WORKLOADS;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: DeploymentFolder) {
    if (!node) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }
    const appName: string = node.getAppName();
    if (appName) {
      NocalhostWebviewPanel.open({
        url: "/workloads",
        title: `${appName}/workloads`,
        newTab: true,
        query: {
          id: node.getNodeStateId(),
          app: node.getAppName(),
          type: node.label,
        },
      });
    }
  }
}
