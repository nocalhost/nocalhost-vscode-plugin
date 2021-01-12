import * as vscode from "vscode";
import ICommand from "./ICommand";
import { LIST_DEPLOYMENTS } from "./constants";
import registerCommand from "./register";
import host from "../host";
import NocalhostWebviewPanel from "../webview/NocalhostWebviewPanel";
import { DeploymentFolder } from "../nodes/workloads/controllerResources/deployment/DeploymentFolder";

export default class ListDeploymentsCommand implements ICommand {
  command: string = LIST_DEPLOYMENTS;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: DeploymentFolder) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    const appName: string = node.getAppName();
    if (appName) {
      NocalhostWebviewPanel.open({
        url: "/deployments",
        title: `${appName}/deployments`,
        newTab: true,
        query: {
          id: node.getNodeStateId(),
          app: node.getAppName(),
        },
      });
    }
  }
}
