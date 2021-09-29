import * as vscode from "vscode";
import * as JsonSchema from "json-schema";
import * as assert from "assert";
import { capitalCase } from "change-case";
import { validate } from "json-schema";
const retry = require("async-retry");

import ICommand from "./ICommand";
import { RUN, START_DEV_MODE } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { ContainerConfig } from "../service/configService";
import { LiveReload } from "../debug/liveReload";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import { closeTerminals, getContainer, waitForSync } from "../debug";
import { RemoteTerminal } from "../debug/remoteTerminal";

export interface ExecCommandParam {
  appName: string;
  workload: string;
  resourceType: string;
  commands: Array<string>;
  namespace: string;
  kubeConfigPath: string;
}

export default class RunCommand implements ICommand {
  command: string = RUN;
  node: ControllerResourceNode;
  container: ContainerConfig;

  disposable: Array<{ dispose(): any }> = [];

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

    this.validateRunConfig(this.container);

    if (!command) {
      const status = await node.getStatus(true);

      if (status !== "developing") {
        vscode.commands.executeCommand(START_DEV_MODE, node, RUN);
        return;
      }
    }

    await host.withProgress({}, async (acton) => {
      acton.report({ message: "Waiting for sync file ..." });

      await retry(waitForSync.bind(null, node), {
        randomize: false,
        retries: 3,
      });

      acton.report({ message: "Waiting for running ..." });
      await this.startRun();
    });
  }

  async startRun() {
    const { container, node } = this;

    await closeTerminals();

    const name = `${capitalCase(node.name)} Process Console`;

    const { run } = container.dev.command;

    const terminal = await RemoteTerminal.create({
      terminal: {
        name,
        iconPath: { id: "vm-running" },
      },
      spawn: { command: "" },
    });
    terminal.show();

    this.disposable.push(
      vscode.window.onDidCloseTerminal(async (e) => {
        if (e.name === name) {
          this.disposable.forEach((d) => d.dispose());
          this.disposable.length = 0;
        }
      })
    );

    if (this.container.dev.hotReload === true) {
      this.disposable.unshift(new LiveReload(node, this.startRun.bind(this)));
    }
  }

  validateRunConfig(config: ContainerConfig) {
    const schema: JsonSchema.JSONSchema6 = {
      $schema: "http://json-schema.org/schema#",
      type: "object",
      required: ["dev"],
      properties: {
        dev: {
          type: "object",
          required: ["command"],
          properties: {
            command: {
              type: "object",
              required: ["run"],
              properties: {
                run: {
                  type: "array",
                  minItems: 1,
                  items: {
                    type: "string",
                  },
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
      `Please check config.\n${valid.errors
        .map((e) => `${e.property}:${e.message}`)
        .join("\n")}`
    );
  }
}
