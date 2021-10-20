import * as vscode from "vscode";
import * as assert from "assert";
import { ValidateFunction } from "ajv";

import ICommand from "./ICommand";
import { DEBUG, START_DEV_MODE } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { DebugSession } from "../debug/debugSession";
import { ContainerConfig } from "../service/configService";
import {
  checkDebuggerInstalled,
  chooseDebugProvider,
  Language,
  support,
} from "../debug/provider";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import { closeTerminals, getContainer, waitForSync } from "../debug";
import { IDebugProvider } from "../debug/provider/IDebugProvider";
import state from "../state";
import validate, { validateData } from "../utils/validate";

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

    const debugProvider = await this.getDebugProvider(node);

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

    this.startDebugging(node, debugProvider);
  }

  validateDebugConfig(config: ContainerConfig) {
    const schema = {
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

    const valid = validateData(config, schema);

    let message = "please check config.";
    if (valid !== true) {
      message = `config \n${(valid as ValidateFunction)
        .errors!.map((e) => `${e.dataPath} ${e.message}`)
        .join("\n")}`;
    }

    assert.strictEqual(valid, true, message);
  }

  async startDebugging(
    node: ControllerResourceNode,
    debugProvider: IDebugProvider
  ) {
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
      debugProvider,
      node,
      this.container
    );
  }
  async getDebugProvider(
    node: ControllerResourceNode
  ): Promise<IDebugProvider> {
    let type: Language = state.getAppState(
      node.getAppName(),
      `${node.name}_debugProvider`
    );

    const { image } = this.container.dev;

    if (image.includes("nocalhost/dev-images")) {
      type = Object.keys(support).find((name) =>
        image.includes(name)
      ) as Language;
    }

    const debugProvider = await chooseDebugProvider(type);

    if (!type) {
      state.setAppState(
        node.getAppName(),
        `${node.name}_debugProvider`,
        debugProvider.name.toLocaleLowerCase()
      );
    }

    const isInstalled = checkDebuggerInstalled(debugProvider);
    if (!isInstalled) {
      return Promise.reject();
    }

    return debugProvider;
  }
}
