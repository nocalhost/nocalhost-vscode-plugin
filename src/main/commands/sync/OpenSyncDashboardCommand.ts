import assert = require("assert");
import * as vscode from "vscode";
import { Associate } from "../../ctl/nhctl/type";
import host from "../../host";

import { OPEN_SYNC_DASHBOARD } from "../constants";
import ICommand from "../ICommand";
import registerCommand from "../register";

export default class OpenSyncDashboardCommand implements ICommand {
  command = OPEN_SYNC_DASHBOARD;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(data: string | { associate: Associate.QueryResult }) {
    let url: string;
    if (typeof data === "string") {
      url = data;
    } else if ("associate" in data) {
      url = data.associate.syncthing_status.gui;
    }

    assert(url, "Dashboard url cannot be empty");

    host.openExternal(`http://${url}`);
  }
}
