import * as vscode from "vscode";

import ICommand from "./ICommand";
import { Sync } from "./SyncServiceCommand";

import { OVERRIDE_SYNC } from "./constants";
import registerCommand from "./register";
import * as nhctl from "../ctl/nhctl";
import host from "../host";
import { AssociateNode } from "../component/syncManage/node";

export default class OverrideSyncCommand implements ICommand {
  command: string = OVERRIDE_SYNC;
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
      if (!syncData.app || !syncData.service) {
        return;
      }
    }

    const result = await host.showInformationMessage(
      "Override the remote changes according to the local folders?",
      { modal: true },
      "Confirm"
    );

    if (result !== "Confirm") {
      return;
    }

    await nhctl.overrideSyncFolders(
      data.kubeConfigPath,
      data.namespace,
      data.app,
      data.service,
      data.resourceType
    );
  }
}
