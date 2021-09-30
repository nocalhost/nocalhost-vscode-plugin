import * as vscode from "vscode";
import * as JsonSchema from "json-schema";
import * as assert from "assert";
import { capitalCase } from "change-case";
import { validate } from "json-schema";
import * as AsyncRetry from "async-retry";

import ICommand from "./ICommand";
import { RUN, START_DEV_MODE } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { ContainerConfig } from "../service/configService";
import { LiveReload } from "../debug/liveReload";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import { closeTerminals, getContainer, waitForSync } from "../debug";
import { RemoteTerminal } from "../debug/remoteTerminal";
import { NhctlCommand } from "../ctl/nhctl";

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
  isReload: boolean = false;
  terminal: RemoteTerminal;

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

    await host.withProgress({ cancellable: true }, async (acton, token) => {
      acton.report({ message: "Waiting for sync file ..." });

      token.onCancellationRequested(() => {
        throw new Error("Cancel waiting");
      });

      await AsyncRetry(
        async (bail) => {
          if (token.isCancellationRequested) {
            bail(new Error());
            return;
          }
          await waitForSync(node);
        },
        {
          randomize: false,
          retries: 3,
        }
      );

      acton.report({ message: "Waiting for running ..." });

      const name = `${capitalCase(node.name)} Process Console`;

      await this.startRun(name);

      this.disposable.push(
        vscode.window.onDidCloseTerminal(async (e) => {
          if ((await e.processId) === (await this.terminal.processId)) {
            await this.terminal.sendCtrlC();

            this.disposable.forEach((d) => d.dispose());
            this.disposable.length = 0;
          }
        })
      );
    });
  }

  async startRun(name: string) {
    const { node } = this;

    await closeTerminals();

    await this.createRunTerminal(name);

    if (this.container.dev.hotReload === true) {
      const liveReload = new LiveReload(node, async () => {
        this.isReload = true;

        await this.terminal.restart();

        this.isReload = false;
      });

      this.disposable.push(liveReload);
    }
  }

  async createRunTerminal(name: string) {
    const { container, node } = this;
    const { run } = container.dev.command;

    const command = NhctlCommand.exec({
      app: node.getAppName(),
      name: node.name,
      namespace: node.getNameSpace(),
      kubeConfigPath: node.getKubeConfigPath(),
      resourceType: node.resourceType,
      commands: run,
    }).getCommand();

    const terminal = await RemoteTerminal.create({
      terminal: {
        name,
        iconPath: { id: "vm-running" },
      },
      spawn: { command },
    });
    terminal.show();

    this.terminal = terminal;

    this.disposable.push(this.terminal);
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
