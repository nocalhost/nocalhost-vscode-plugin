import * as vscode from "vscode";
import * as JsonSchema from "json-schema";
import * as assert from "assert";
const retry = require("async-retry");

import ICommand from "./ICommand";
import { RUN, START_DEV_MODE } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { validate } from "json-schema";
import { ContainerConfig } from "../service/configService";
import { getRunningPodNames, NhctlCommand } from "../ctl/nhctl";
import { LiveReload } from "../debug/liveReload";
import { KubernetesResourceNode } from "../nodes/abstract/KubernetesResourceNode";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import {
  getContainer,
  killContainerCommandProcess,
  waitForSync,
} from "../debug";

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

    host.showProgressing("Waiting for running ...", async () => {
      await retry(waitForSync.bind(null, node), {
        randomize: false,
        retries: 3,
      });

      await this.startRun();
    });
  }

  async startRun() {
    const { container, node } = this;

    const runCommand = (container.dev.command?.run ?? []).join(" ");

    const podNames = await getRunningPodNames({
      name: node.name,
      kind: node.resourceType,
      namespace: node.getNameSpace(),
      kubeConfigPath: node.getKubeConfigPath(),
    });

    assert.strictEqual(podNames.length, 1, "not found pod");

    await killContainerCommandProcess(container, node, podNames[0]);

    const command = await NhctlCommand.exec({
      namespace: node.getNameSpace(),
      kubeConfigPath: node.getKubeConfigPath(),
      args: [
        podNames[0],
        "-it",
        `-c nocalhost-dev`,
        `-- bash -c "${runCommand}"`,
      ],
    });

    const resourceNode = node as KubernetesResourceNode;

    const name = "run:" + `${node.getAppName()}-${node.name}`;

    host.invokeInNewTerminal(command.getCommand(), name);

    this.disposable.push(
      vscode.window.onDidCloseTerminal(async (e) => {
        if (e.name === name) {
          this.disposable.forEach((d) => d.dispose());
          this.disposable.length = 0;

          await killContainerCommandProcess(container, node, podNames[0]);
        }
      })
    );

    if (this.container.dev.hotReload === true) {
      const liveReload = new LiveReload(
        {
          namespace: node.getNameSpace(),
          kubeConfigPath: node.getKubeConfigPath(),
          resourceType: resourceNode.resourceType,
          app: node.getAppName(),
          service: resourceNode.name,
        },
        this.startRun.bind(this)
      );

      this.disposable.unshift(liveReload);
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
      `please check config.\n${valid.errors
        .map((e) => `${e.property}:${e.message}`)
        .join("\n")}`
    );
  }
}
