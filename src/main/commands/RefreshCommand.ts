import vscode from "vscode";

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
  execCommand(node?: BaseNocalhostNode) {
    if (!node) {
      // clear all data;
      state.startAutoRefresh();
      // state.clearAllData();
    }
    if (node instanceof NocalhostRootNode) {
      this.provider.refresh(undefined);
    } else {
      this.provider.refresh(node);
    }
  }
}
