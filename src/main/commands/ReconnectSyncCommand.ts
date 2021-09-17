import * as vscode from "vscode";

import ICommand from "./ICommand";
import { Sync } from "./SyncServiceCommand";

import { RECONNECT_SYNC } from "./constants";
import registerCommand from "./register";
import * as nhctl from "../ctl/nhctl";
import host from "../host";

export default class ReconnectSyncCommand implements ICommand {
  command: string = RECONNECT_SYNC;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(syncData: Sync) {
    if (!syncData.app || !syncData.service) {
      return;
    }

    const result = await host.showInformationMessage(
      "Do you want to resume file sync?",
      { modal: true },
      "Confirm"
    );
    if (result !== "Confirm") {
      return;
    }
    await nhctl.reconnectSync(
      syncData.kubeConfigPath,
      syncData.namespace,
      syncData.app,
      syncData.service,
      syncData.resourceType
    );
  }
}
