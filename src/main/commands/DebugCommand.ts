import * as vscode from "vscode";
import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { ValidateFunction } from "ajv";

import parse = require("json5/lib/parse");

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
  supportLanguage,
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

    const debugProvider = await this.getDebugProvider();

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
    const debugProvider = await chooseDebugProvider(await this.getLanguage());

    await checkDebuggerDependencies(debugProvider);

    this.createDebugLaunchConfig(debugProvider.name as Language);

    return debugProvider;
  }
  async getLanguage() {
    const { image } = this.container.dev;
    let type: Language;

    const filePath = path.join(
      host.getCurrentRootPath(),
      "/.vscode/launch.json"
    );
    if (fs.existsSync(filePath)) {
      const launch = parse(fs.readFileSync(filePath).toString()) as {
        configurations: (vscode.DebugConfiguration & {
          language: Language;
        })[];
      };
      const configuration = launch.configurations.find(
        (item) =>
          item.type === "nocalhost" &&
          item.language &&
          item.request === "attach"
      );

      return configuration?.language;
    } else if (image.includes("nocalhost/dev-images")) {
      type = Object.keys(supportLanguage).find((name) =>
        image.includes(name)
      ) as Language;
    }

    return type;
  }

  async createDebugLaunchConfig(language: Language) {
    const filePath = path.join(
      host.getCurrentRootPath(),
      "/.vscode/launch.json"
    );

    let launch: {
      configurations: (vscode.DebugConfiguration & {
        language: Language;
      })[];
    };

    if (!fs.existsSync(filePath)) {
      const dir = path.dirname(filePath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      launch = { configurations: [] };
    } else {
      const str = fs.readFileSync(filePath).toString();

      launch = parse(str);
    }

    if ("configurations" in launch) {
      const configurations = launch["configurations"];

      if (Array.isArray(configurations)) {
        let index = configurations.findIndex(
          (item) => item.type === "nocalhost" && item.language === language
        );

        if (index > -1) {
          return;
        }

        configurations.unshift({
          type: "nocalhost",
          language,
          request: "attach",
          name: "Nocalhost Debug",
        });

        fs.writeFileSync(filePath, JSON.stringify(launch, null, 2));
      }
    }
  }
}
