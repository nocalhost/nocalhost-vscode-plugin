import * as vscode from "vscode";

import ICommand from "./ICommand";
import { DEBUG, START_DEV_MODE } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { DebugSession } from "../debug/debugSession";
import { JavaDebugProvider } from "../debug/javaDebugProvider";
import { NodeDebugProvider } from "../debug/nodeDebugProvider";
import { Deployment } from "../nodes/workloads/controllerResources/deployment/Deployment";
import { GoDebugProvider } from "../debug/goDebugProvider";
import logger from "../utils/logger";
import { IDebugProvider } from "../debug/IDebugprovider";

export default class DebugCommand implements ICommand {
  command: string = DEBUG;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(...rest: any[]) {
    const [node, command] = rest as [Deployment, string];
    if (!node) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }

    if (!command) {
      const status = await node.getStatus(true);

      if (status !== "developing") {
        vscode.commands.executeCommand(START_DEV_MODE, node, DEBUG);
        return;
      }
    }
    this.startDebugging(node);
  }

  async startDebugging(node: Deployment) {
    await host.showProgressingToken(
      {
        title: "Debugging ...",
        cancellable: true,
        location: vscode.ProgressLocation.Notification,
      },
      async (_, token) => {
        try {
          const debugSession = new DebugSession();

          const workspaceFolder = await host.showWorkspaceFolderPick();

          if (!workspaceFolder) {
            host.showInformationMessage(
              "You need to open a folder before execute this command."
            );
            return;
          }

          await debugSession.launch(
            workspaceFolder,
            await this.getDebugProvider(node),
            node
          );
        } catch (e) {
          (token as any).cancel();
          host.log("[debug] cancel");
          logger.info("[debug] cancel");
        }
      }
    );
  }

  async getDebugProvider(node: Deployment): Promise<IDebugProvider> {
    let containerConfig = await DebugSession.getContainer(node);

    let type: string;

    if (containerConfig.dev.image.includes("nocalhost/dev-images")) {
      if (containerConfig.dev.image.includes("node")) {
        type = "node";
      } else if (containerConfig.dev.image.includes("golang")) {
        type = "golang";
      } else if (containerConfig.dev.image.includes("python")) {
        type = "python";
      } else if (containerConfig.dev.image.includes("java")) {
        type = "java";
      }
    }

    return await this.chooseDebugProvider(type);
  }

  async chooseDebugProvider(type?: string) {
    const supportType = ["node", "java", "golang"];

    if (!type) {
      type = await vscode.window.showQuickPick(supportType);
    }

    let debugProvider = null;
    switch (type) {
      case "node":
        debugProvider = new NodeDebugProvider();
        break;
      case "golang":
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
