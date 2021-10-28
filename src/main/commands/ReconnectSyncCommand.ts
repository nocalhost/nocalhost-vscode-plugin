import * as vscode from "vscode";

import ICommand from "./ICommand";
import { Sync } from "./SyncServiceCommand";

import { RECONNECT_SYNC } from "./constants";
import registerCommand from "./register";
import * as nhctl from "../ctl/nhctl";
import host from "../host";
import { AssociateNode } from "../component/syncManage/node";

export default class ReconnectSyncCommand implements ICommand {
  command: string = RECONNECT_SYNC;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(syncData: Sync | AssociateNode) {
    let data: Sync;

    if (syncData instanceof AssociateNode) {
      const {
        associate: {
          kubeconfig_path,
          svc_pack: { ns, app, svc, svc_type },
        },
      } = syncData;
      data = {
        kubeConfigPath: kubeconfig_path,
        namespace: ns,
        app,
        service: svc,
        resourceType: svc_type,
      };
    } else {
      data = syncData;

      if (!data.app || !data.service) {
        return;
      }
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
      data.kubeConfigPath,
      data.namespace,
      data.app,
      data.service,
      data.resourceType
    );
  }
}
