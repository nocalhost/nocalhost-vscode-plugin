import * as vscode from "vscode";

import ICommand from "./ICommand";

import { REFRESH } from "./constants";
import NocalhostAppProvider from "../appProvider";
import registerCommand from "./register";
import { BaseNocalhostNode } from "../nodes/types/nodeType";

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
  execCommand(node?: BaseNocalhostNode) {
    if (this.provider.refreshTimer && this.provider.refreshTimeMS) {
      clearTimeout(this.provider.refreshTimer);
      this.provider.startRefreshInterval(this.provider.refreshTimeMS);
    }
    this.provider.refresh(node);
  }
}
