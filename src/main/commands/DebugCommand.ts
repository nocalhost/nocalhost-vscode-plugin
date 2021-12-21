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
  checkDebuggerDependencies,
  chooseDebugProvider,
  Language,
  support,
} from "../debug/provider";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import { getContainer, waitForSync } from "../debug";
import { IDebugProvider } from "../debug/provider/IDebugProvider";
import { validateData } from "../utils/validate";

export default class DebugCommand implements ICommand {
  command: string = DEBUG;
  node: ControllerResourceNode;
  container: ContainerConfig;
  configuration: vscode.DebugConfiguration;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(...rest: any[]) {
    const [node, param] = rest as [
      ControllerResourceNode,
      { command: string; configuration: vscode.DebugConfiguration } | undefined
    ];
    if (!node) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }

    this.configuration = param?.configuration;
    this.node = node;
    this.container = await getContainer(node);

    this.validateDebugConfig(this.container);

    const debugProvider = await this.getDebugProvider();

    if (!param?.command) {
      const status = await node.getStatus(true);

      if (status !== "developing") {
        vscode.commands.executeCommand(START_DEV_MODE, node, {
          command: DEBUG,
          configuration: this.configuration,
        });
        return;
      }
    }

    await waitForSync(node, DEBUG);

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
    const workspaceFolder = await host.showWorkspaceFolderPick();

    if (!workspaceFolder) {
      host.showInformationMessage(
        "You need to open a folder before execute this command."
      );
      return;
    }

    const debugSession = new DebugSession(
      workspaceFolder,
      debugProvider,
      node,
      this.container,
      this.configuration
    );

    await debugSession.launch();
  }
  async getDebugProvider(): Promise<IDebugProvider> {
    let type: Language;
    const { image } = this.container.dev;

    if (image.includes("nocalhost/dev-images")) {
      type = Object.keys(support).find((name) =>
        image.includes(name)
      ) as Language;
    }

    const debugProvider = await chooseDebugProvider(type);

    await checkDebuggerDependencies(debugProvider);

    return debugProvider;
  }
}
