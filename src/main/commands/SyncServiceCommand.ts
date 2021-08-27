import * as vscode from "vscode";
import { omit } from "lodash";
import ICommand from "./ICommand";

import { RECONNECT_SYNC, OVERRIDE_SYNC, SYNC_SERVICE } from "./constants";
import registerCommand from "./register";
import * as nhctl from "../ctl/nhctl";
import host from "../host";
import logger from "../utils/logger";
import { DEV_ASSOCIATE_LOCAL_DIRECTORYS } from "../constants";

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
  syncData: Partial<Sync>;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }

  static async checkSync() {
    const currentRootPath = host.getCurrentRootPath();

    if (!currentRootPath) {
      return;
    }

    const devAssociateLocalDirectorys =
      host.getGlobalState(DEV_ASSOCIATE_LOCAL_DIRECTORYS) ?? {};
    const current = devAssociateLocalDirectorys[currentRootPath];

    if (current) {
      const { app, resourceType, service, kubeConfigPath, namespace } = current;

      try {
        await nhctl.associate(
          kubeConfigPath,
          namespace,
          app,
          currentRootPath,
          resourceType,
          service,
          "--migrate"
        );
      } catch (err) {
        logger.error("associate migrate:", err);
      } finally {
        host.setGlobalState(
          DEV_ASSOCIATE_LOCAL_DIRECTORYS,
          omit(devAssociateLocalDirectorys, currentRootPath)
        );
      }
    }

    let result: {
      kubeconfig_path: string;
      svc_pack: {
        ns: string;
        app: string;
        svc_type: string;
        svc: string;
        container: string;
      };
    };

    try {
      result = await nhctl.NhctlCommand.create(
        `dev associate-queryer -s ${currentRootPath} --current --json`
      )
        .toJson()
        .exec();

      if (result) {
        const {
          app,
          svc_type: resourceType,
          svc: service,
          ns: namespace,
        } = result.svc_pack;

        vscode.commands.executeCommand(SYNC_SERVICE, {
          app,
          resourceType,
          service,
          kubeConfigPath: result.kubeconfig_path,
          namespace,
        });
      }
    } catch (err) {
      logger.error("checkSync error:", err);
      vscode.commands.executeCommand(SYNC_SERVICE);
    }
  }
  async execCommand(syncData: Sync) {
    if (this._id) {
      clearTimeout(this._id);
      this._id = null;
    }

    this.syncData = syncData || {};

    this.getSyncStatus();
  }

  async getSyncStatus() {
    clearTimeout(this._id);

    const syncData = this.syncData;
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
    } finally {
      this._id = setTimeout(async () => {
        await this.getSyncStatus();
      }, 500);
    }
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
