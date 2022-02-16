import * as vscode from "vscode";

import ICommand from "./ICommand";

import { REFRESH } from "./constants";
import NocalhostAppProvider from "../appProvider";
import registerCommand from "./register";
import { BaseNocalhostNode } from "../nodes/types/nodeType";
import { NocalhostRootNode } from "../nodes/NocalhostRootNode";
import state from "../state";

export default class RefreshCommand implements ICommand {
  command: string = REFRESH;
  provider: NocalhostAppProvider;
  constructor(
    context: vscode.ExtensionContext,
    provider: NocalhostAppProvider
  ) {
    this.provider = provider;
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node?: BaseNocalhostNode) {
    if (!node) {
      vscode.commands.executeCommand("setContext", "refreshing", true);

      await state.startAutoRefresh(true);

      setTimeout(() => {
        vscode.commands.executeCommand("setContext", "refreshing", false);
      }, 1_000);

      return;
    }
    if (node instanceof NocalhostRootNode) {
      this.provider.refresh(undefined);
    } else {
      this.provider.refresh(node);
    }
  }
}

export class RefreshingCommand implements ICommand {
  command: string = "Nocalhost.refreshing";
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  execCommand(): void {}
}
