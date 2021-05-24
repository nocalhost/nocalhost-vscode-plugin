import { IRootNode } from "./../domain/IRootNode";
import * as vscode from "vscode";
import { uniqBy } from "lodash";
import ICommand from "./ICommand";
import NocalhostAppProvider from "../appProvider";
import { SIGN_IN } from "./constants";
import registerCommand from "./register";
import state from "../state";
import host from "../host";
import {
  AccountCluster as AccountClusterService,
  updateStateRootNodes,
} from "../clusters";

interface LoginInfo {
  username: string;
  from?: "plugin";
  password: string;
  baseUrl: string;
}

export default class SignInCommand implements ICommand {
  command: string = SIGN_IN;
  context: vscode.ExtensionContext;
  provider: NocalhostAppProvider;
  constructor(
    context: vscode.ExtensionContext,
    provider: NocalhostAppProvider
  ) {
    this.provider = provider;
    this.context = context;
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(info: LoginInfo) {
    host.showProgressing("Logging in ...", async () => {
      try {
        const newServerNode = await AccountClusterService.appendClusterByLoginInfo(
          info
        );
        if (newServerNode) {
          const newNodes: IRootNode[] = await AccountClusterService.getServerClusterRootNodes(
            newServerNode
          );
          newNodes.forEach((i) => {
            updateStateRootNodes(i);
          });
        }

        await vscode.commands.executeCommand(
          "setContext",
          "emptyCluster",
          false
        );
        await vscode.commands.executeCommand(
          "setContext",
          "Nocalhost.visibleTree",
          true
        );
        this.provider.refresh();

        vscode.window.showInformationMessage("login successful");
      } catch (e) {
        vscode.window.showWarningMessage(e && e.error && e.error.message);
      }
    });
  }
}
