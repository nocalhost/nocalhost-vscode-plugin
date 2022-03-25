import * as vscode from "vscode";
import host from "../host";
import { ADD_KUBECONFIG } from "./constants";

import ICommand from "./ICommand";
import registerCommand from "./register";

export default class HomeWebViewCommand implements ICommand {
  command: string = "Nocalhost.homeWebView";
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(params?: any) {
    const { command, data } = params;

    try {
      // Because of https://github.com/microsoft/vscode/issues/105774, run the command twice which seems to fix things
      let count = 0;
      while (count++ < 2) {
        void (await vscode.commands.executeCommand("vscode.moveViews", {
          viewIds: [],
          destinationId: "workbench.view.extension.NocalhostView",
        }));
      }
    } catch {}

    await host.delay(0);

    await await vscode.commands.executeCommand(ADD_KUBECONFIG);

    await host.delay(100);

    vscode.commands.executeCommand(command, data);
  }
}
