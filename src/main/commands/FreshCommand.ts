import * as vscode from "vscode";

import ICommand from "./ICommand";

import { REFRESH } from "./constants";
import NocalhostAppProvider from "../appProvider";
import registerCommand from "./register";
import { BaseNocalhostNode } from "../nodes/types/nodeType";
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
      // clear all data;
      state.clearAllData();
    }
    this.provider.refresh(node);
  }
}
