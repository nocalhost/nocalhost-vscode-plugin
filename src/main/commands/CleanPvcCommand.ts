import * as vscode from "vscode";

import ICommand from "./ICommand";

import * as nhctl from "../ctl/nhctl";
import { CLEAN_PVC } from "./constants";
import registerCommand from "./register";
import { Deployment } from "../nodes/workloads/controllerResources/deployment/Deployment";
import host from "../host";
import { AppNode } from "../nodes/AppNode";

export default class CleanPvcCommand implements ICommand {
  command: string = CLEAN_PVC;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: Deployment | AppNode) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    let appName: string | undefined, workloadName: string | undefined;
    if (node instanceof Deployment) {
      appName = node.getAppName();
      workloadName = node.name;
    } else if (node instanceof AppNode) {
      appName = node.name;
    }
    if (appName) {
      await nhctl.cleanPVC(appName, workloadName);
    }
  }
}
