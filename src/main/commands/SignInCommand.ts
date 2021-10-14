import { IRootNode } from "./../domain/IRootNode";
import * as vscode from "vscode";
import ICommand from "./ICommand";
import NocalhostAppProvider from "../appProvider";
import { SIGN_IN } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { AccountCluster as AccountClusterService } from "../clusters";
import logger from "../utils/logger";
import state from "../state";

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
        info.username = info.username.trim();
        info.baseUrl = info.baseUrl.trim();

        const newServerNode = await AccountClusterService.appendClusterByLoginInfo(
          info
        );

        if (newServerNode) {
          const newNodes: IRootNode[] = await AccountClusterService.getServerClusterRootNodes(
            newServerNode
          );
          if (newNodes.length === 0) {
            vscode.window.showWarningMessage(
              `No cluster found for ${info.username || "account"}`
            );
            return;
          }
        }

        await state.refreshTree();

        vscode.window.showInformationMessage("Login successful");
      } catch (e) {
        logger.error("[sigin]");
        logger.error(e);
        vscode.window.showWarningMessage(e && e.error && e.error.message);
      }
    });
  }
}
