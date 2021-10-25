import * as vscode from "vscode";
import ICommand from "./ICommand";
import NocalhostAppProvider from "../appProvider";
import { SIGN_IN } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { AccountCluster as AccountClusterService } from "../clusters";
import state from "../state";
import { NocalhostRootNode } from "../nodes/NocalhostRootNode";
import { NOCALHOST } from "../constants";

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
    await host.showProgressing("Logging in ...", async () => {
      info.username = info.username.trim();
      info.baseUrl = info.baseUrl.trim();

      try {
        await host.stopAutoRefresh(true);

        const accountClusterNode = await AccountClusterService.appendClusterByLoginInfo(
          info
        );

        const rootNode = state.getNode(NOCALHOST) as NocalhostRootNode;
        await rootNode.addCluster(accountClusterNode);
        vscode.window.showInformationMessage("Login successful");
      } catch (error) {
        throw error;
      } finally {
        await state.refreshTree(true);
      }
    });
  }
}
