import * as vscode from "vscode";

import ICommand from "./ICommand";

import { OVERRIDE_SYNC, SYNC_SERVICE } from "./constants";
import registerCommand from "./register";
import * as nhctl from "../ctl/nhctl";
import host from "../host";

export interface Sync {
  app: string;
  service: string;
}

interface SyncMsg {
  status: string;
  msg: string;
  tips: string;
  outOfSync?: string;
}

export default class SyncServiceCommand implements ICommand {
  command: string = SYNC_SERVICE;
  _id: NodeJS.Timeout | null = null;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(syncData: Sync) {
    if (this._id) {
      clearInterval(this._id);
      this._id = null;
    }
    if (!syncData.app || !syncData.service) {
      host.statusBar.hide();
      host.outSyncStatusBar.hide();
      return;
    }

    this._id = setInterval(async () => {
      const result = await nhctl.getSyncStatus(syncData.app, syncData.service);
      if (!result) {
        // hide status bar
        host.statusBar.hide();
        host.outSyncStatusBar.hide();
      } else {
        // update status bar
        let r: SyncMsg;
        r = JSON.parse(result) as SyncMsg;
        if (r.outOfSync) {
          const overrideSyncCommand: vscode.Command = {
            title: OVERRIDE_SYNC,
            command: OVERRIDE_SYNC,
            arguments: [syncData],
          };
          host.outSyncStatusBar.text = "$(warning)";
          host.outSyncStatusBar.command = overrideSyncCommand;
          host.outSyncStatusBar.tooltip = r.outOfSync;
          host.outSyncStatusBar.show();
        } else {
          host.outSyncStatusBar.hide();
        }
        host.statusBar.text = `$(${this.getIcon(r.status)}) ${r.msg}`;
        host.statusBar.tooltip = r.tips;
        host.statusBar.show();
      }
    }, 500);
  }

  getIcon(status: string) {
    let icon = "error";
    switch (status) {
      case "disconnected":
        icon = "debug-disconnect";
        break;
      case "scanning":
        icon = "sync~spin";
        break;
      case "error":
        icon = "error";
        break;
      case "syncing":
        icon = "cloud-upload";
        break;
      case "idle":
        icon = "check";
        break;
      case "end":
        icon = "error";
        break;
    }
    return icon;
  }
}
