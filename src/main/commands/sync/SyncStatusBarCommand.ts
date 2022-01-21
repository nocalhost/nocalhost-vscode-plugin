import * as vscode from "vscode";
import * as nls from "vscode-nls";
import host from "../../host";

import { OVERRIDE_SYNC, RECONNECT_SYNC, STATUSBAR_SYNC } from "../constants";
import ICommand from "../ICommand";
import registerCommand from "../register";
import { Sync, SyncMsg } from "./SyncServiceCommand";

const localize = nls.loadMessageBundle();

export default class SyncStatusBarCommand implements ICommand {
  command = STATUSBAR_SYNC;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(ary: any) {
    const [msg, sync] = ary as [SyncMsg, Sync];

    let commands: { [key: string]: Function } = {};
    if (msg.status === "disconnected") {
      commands[localize("resumeSync", "Resume File Sync")] = () =>
        vscode.commands.executeCommand(RECONNECT_SYNC, sync);
    }

    commands = Object.assign(commands, {
      [localize("overrideRemoteChang", "Overwrite Remote File")]: () =>
        vscode.commands.executeCommand(OVERRIDE_SYNC, sync),
      "Open Sync Dashboard": () => host.openExternal(`http://${msg.gui}`),
    });

    const result = await host.showQuickPick(Object.keys(commands));

    if (!result) {
      return;
    }

    commands[result]();
  }
}
