import * as vscode from "vscode";

import ICommand from "./ICommand";

import { RECONNECT_SYNC, OVERRIDE_SYNC, SYNC_SERVICE } from "./constants";
import registerCommand from "./register";
import * as nhctl from "../ctl/nhctl";
import host from "../host";
import logger from "../utils/logger";

export interface Sync {
  app: string;
  resourceType: string;
  service: string;
  kubeConfigPath: string;
  namespace: string;
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
      logger.info("syncData.app is null", true);
      host.statusBar.hide();
      return;
    }

    this._id = setInterval(async () => {
      try {
        const result = await nhctl.getSyncStatus(
          syncData.resourceType,
          syncData.kubeConfigPath,
          syncData.namespace,
          syncData.app,
          syncData.service
        );
        if (!result) {
          // hide status bar
          if (this._id) {
            // clearInterval(this._id);
            logger.info("sync-status result empty");
            // this._id = null;
          }
          // host.statusBar.hide();
          // host.outSyncStatusBar.hide();
        } else {
          // update status bar

          let r: SyncMsg;
          r = JSON.parse(result) as SyncMsg;

          host.statusBar.text = `$(${this.getIcon(r.status)}) ${r.msg}`;
          host.statusBar.tooltip = r.tips;
          host.statusBar.command = null;

          if (r.status === "disconnected") {
            const reconnectSyncCommand: vscode.Command = {
              title: RECONNECT_SYNC,
              command: RECONNECT_SYNC,
              arguments: [syncData],
            };
            host.statusBar.command = reconnectSyncCommand;
          } else if (r.outOfSync || r.status === "outOfSync") {
            const overrideSyncCommand: vscode.Command = {
              title: OVERRIDE_SYNC,
              command: OVERRIDE_SYNC,
              arguments: [syncData],
            };

            host.statusBar.command = overrideSyncCommand;
            host.statusBar.tooltip = r.outOfSync;
          }

          host.statusBar.show();
        }
      } catch (e) {
        logger.info("sync-status error");
        console.log(e);
        logger.error(e);
      }
    }, 500);
  }

  getIcon(status: string) {
    let icon = "error";

    switch (status) {
      case "outOfSync":
        icon = "warning";
        break;
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
