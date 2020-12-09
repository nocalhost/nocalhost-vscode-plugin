import * as vscode from "vscode";

import ICommand from "./ICommand";

import { SHOW_DASHBOARD } from "./constants";
import registerCommand from "./register";

import { showDashboard } from "../webviews";

export default class ShowDashboardCommand implements ICommand {
  command: string = SHOW_DASHBOARD;
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  execCommand() {
    showDashboard(this.context);
  }
}
