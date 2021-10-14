import * as vscode from "vscode";
import * as JsonSchema from "json-schema";
import * as assert from "assert";
import { validate } from "json-schema";

import ICommand from "./ICommand";
import { DEBUG, START_DEV_MODE } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { DebugSession } from "../debug/debugSession";
import { ContainerConfig } from "../service/configService";
import { chooseDebugProvider, Language, support } from "../debug/provider";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import { closeTerminals, getContainer, waitForSync } from "../debug";
import { IDebugProvider } from "../debug/provider/IDebugProvider";
import state from "../state";

export default class DebugCommand implements ICommand {
  command: string = DEBUG;
  node: ControllerResourceNode;
  container: ContainerConfig;

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
    this.container = await getContainer(node);
    this.validateDebugConfig(this.container);

    await closeTerminals();

    if (!command) {
      const status = await node.getStatus(true);

      if (status !== "developing") {
        vscode.commands.executeCommand(START_DEV_MODE, node, {
          command: DEBUG,
        });
        return;
      }
    }

    await waitForSync(node);

    this.startDebugging(node);
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

    assert.strictEqual(
      valid.errors.length,
      0,
      `please check config.\n${valid.errors
        .map((e) => `${e.property}:${e.message}`)
        .join("\n")}`
    );
  }

  async startDebugging(node: ControllerResourceNode) {
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
      await getContainer(node)
    );
  }

  async getDebugProvider(
    node: ControllerResourceNode
  ): Promise<IDebugProvider> {
    let containerConfig = await getContainer(node);

    let type: Language = state.getAppState(
      node.getAppNode().getNodeStateId(),
      "debugProvider"
    );

    const { image } = containerConfig.dev;

    if (image.includes("nocalhost/dev-images")) {
      type = Object.keys(support).find((name) =>
        image.includes(name)
      ) as Language;
    }

    const provider = await chooseDebugProvider(type);

    if (!type) {
      state.setAppState(
        node.getAppNode().getNodeStateId(),
        "debugProvider",
        provider.name.toLocaleLowerCase()
      );
    }

    return provider;
  }
}
