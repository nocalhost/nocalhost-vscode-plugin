import * as vscode from "vscode";

import ICommand from "./ICommand";
import { DEBUG } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { DebugSession } from "../debug/debugSession";
import { JavaDebugProvider } from "../debug/javaDebugProvider";
import { NodeDebugProvider } from "../debug/nodeDebugProvider";
import { Deployment } from "../nodes/workloads/controllerResources/deployment/Deployment";
import { GoDebugProvider } from "../debug/goDebugProvider";
import logger from "../utils/logger";

export default class DebugCommand implements ICommand {
  command: string = DEBUG;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: Deployment) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }

    await host.showProgressingToken(
      {
        title: "Debugging ...",
        cancellable: true,
        location: vscode.ProgressLocation.Notification,
      },
      async (progress, token) => {
        try {
          const debugSession = new DebugSession();
          // get current workspaceFolder
          const workspaceFolder = await host.showWorkspaceFolderPick();
          if (!workspaceFolder) {
            host.showInformationMessage("no workspacefolder");
            return;
          }
          // TODO:
          const supportType = ["node", "go", "java"];
          const type = await vscode.window.showQuickPick(supportType);
          if (!type) {
            return;
          }
          const debugProvider = this.getDebugProvider(type);
          if (!debugProvider) {
            host.showInformationMessage("Not support");
            return;
          }
          await debugSession.launch(workspaceFolder, debugProvider, node);
        } catch (e) {
          (token as any).cancel();
          host.log("[debug] cancel");
          logger.info("[debug] cancel");
        }
      }
    );
  }

  getDebugProvider(type: string) {
    let debugProvider = null;
    switch (type) {
      case "node":
        debugProvider = new NodeDebugProvider();
        break;
      case "go":
        debugProvider = new GoDebugProvider();
        break;
      case "java":
        debugProvider = new JavaDebugProvider();
        break;
      default:
    }

    return debugProvider;
  }
}
