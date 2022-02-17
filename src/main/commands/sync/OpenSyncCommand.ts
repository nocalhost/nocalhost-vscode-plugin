import vscode from "vscode";
import * as nls from "vscode-nls";
import host from "../../host";

import {
  OVERRIDE_SYNC,
  RECONNECT_SYNC,
  OPEN_SYNC_COMMAND,
  OPEN_SYNC_DASHBOARD,
} from "../constants";
import ICommand from "../ICommand";
import registerCommand from "../register";
import { Sync, SyncMsg } from "./SyncServiceCommand";

const localize = nls.loadMessageBundle();

export default class OpenSyncCommand implements ICommand {
  command = OPEN_SYNC_COMMAND;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(ary: any) {
    const [msg, sync] = ary as [SyncMsg, Sync];

    let commands: { [key: string]: Function } = {};
    if (msg.status === "disconnected") {
      commands[localize("resumeSync", "Resume File Sync")] =
        vscode.commands.executeCommand.bind(null, RECONNECT_SYNC, sync);
    }

    commands = Object.assign(commands, {
      [localize("overrideRemoteChang", "Overwrite Remote File")]:
        vscode.commands.executeCommand.bind(null, OVERRIDE_SYNC, sync),
      [localize("sync.openDashboard", "Open Sync Dashboard")]:
        vscode.commands.executeCommand.bind(null, OPEN_SYNC_DASHBOARD, msg.gui),
    });

    const result = await host.showQuickPick(Object.keys(commands));

    if (!result) {
      return;
    }

    commands[result]();
  }
}
