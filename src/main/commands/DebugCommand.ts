import * as vscode from "vscode";
import * as JsonSchema from "json-schema";
import { validate } from "json-schema";
const retry = require("async-retry");

import ICommand from "./ICommand";
import { SyncMsg } from "./SyncServiceCommand";
import { DEBUG, START_DEV_MODE } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { DebugSession } from "../debug/debugSession";
import { ContainerConfig } from "../service/configService";

import {
  chooseDebugProvider,
  Language,
  IDebugProvider,
} from "../debug/provider";
import { getSyncStatus } from "../ctl/nhctl";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";

export default class DebugCommand implements ICommand {
  command: string = DEBUG;
  node: ControllerResourceNode;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(...rest: any[]) {
    const [node, command] = rest as [ControllerResourceNode, string];
    if (!node) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }

    this.node = node;

    await this.getContainer(node);

    if (!command) {
      const status = await node.getStatus(true);

      if (status !== "developing") {
        vscode.commands.executeCommand(START_DEV_MODE, node, DEBUG);
        return;
      }
    }

    await retry(this.waitForSync.bind(this), { randomize: false, retries: 3 });

    this.startDebugging(node);
  }

  async waitForSync() {
    const { node } = this;
    const str = await getSyncStatus(
      node.resourceType,
      node.getKubeConfigPath(),
      node.getNameSpace(),
      node.getAppName(),
      node.name,
      ["--timeout 120", "--wait"]
    );

    const syncMsg: SyncMsg = JSON.parse(str);

    if (syncMsg.status === "idle") {
      return;
    }
    throw new Error("wait for sync timeout");
  }
  async getContainer(node: ControllerResourceNode) {
    let container: ContainerConfig | undefined;

    const serviceConfig = node.nocalhostService;
    const containers = (serviceConfig && serviceConfig.containers) || [];
    if (containers.length > 1) {
      const containerNames = containers.map((c) => c.name);
      const containerName = await vscode.window.showQuickPick(containerNames);

      if (!containerName) {
        return;
      }

      container = containers.filter((c) => {
        return c.name === containerName;
      })[0];
    } else if (containers.length === 1) {
      container = containers[0];
    } else {
      host.showInformationMessage("Missing container confiuration");
      return;
    }

    this.validateDebugConfig(container);

    return container;
  }

  validateDebugConfig(config: ContainerConfig) {
    const schema: JsonSchema.JSONSchema6 = {
      $schema: "http://json-schema.org/schema#",
      type: "object",
      required: ["dev"],
      properties: {
        dev: {
          type: "object",
          required: ["command", "debug"],
          properties: {
            command: {
              type: "object",
              required: ["debug"],
              properties: {
                debug: {
                  type: "array",
                  minItems: 1,
                  items: {
                    type: "string",
                  },
                },
              },
            },
            debug: {
              type: "object",
              properties: {
                remoteDebugPort: {
                  type: "number",
                },
              },
            },
          },
        },
      },
    };

    const valid = validate(config, schema);

    if (valid.errors.length > 0) {
      let message = "please check config.\n";
      valid.errors.forEach((e) => {
        message += `${e.property}: ${e.message} \n`;
      });
      throw new Error(message);
    }
  }

  private async startDebugging(node: ControllerResourceNode) {
    await host.withProgress(
      {
        title: "Waiting for debugging ...",
        cancellable: true,
        location: vscode.ProgressLocation.Notification,
      },
      async (_) => {
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
          node,
          await this.getContainer(node)
        );
      }
    );
  }

  private async getDebugProvider(
    node: ControllerResourceNode
  ): Promise<IDebugProvider> {
    let containerConfig = await this.getContainer(node);

    let type: Language = null;

    const { image } = containerConfig.dev;

    if (image.includes("nocalhost/dev-images")) {
      if (image.includes("node")) {
        type = "node";
      } else if (image.includes("golang")) {
        type = "golang";
      } else if (image.includes("python")) {
        type = "python";
      } else if (image.includes("java")) {
        type = "java";
      }
    }

    return await chooseDebugProvider(type);
  }
}
