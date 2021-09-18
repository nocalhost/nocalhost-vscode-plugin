import * as vscode from "vscode";
import * as JsonSchema from "json-schema";

import ICommand from "./ICommand";
import { RUN, START_DEV_MODE } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { Deployment } from "../nodes/workloads/controllerResources/deployment/Deployment";
import { validate } from "json-schema";
import { ContainerConfig } from "../service/configService";
import { getRunningPodNames, NhctlCommand } from "../ctl/nhctl";
import logger from "../utils/logger";
import { LiveReload } from "../debug/liveReload";
import { KubernetesResourceNode } from "../nodes/abstract/KubernetesResourceNode";
import { exec } from "../ctl/shell";

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
  node: Deployment;
  container: ContainerConfig;

  disposable: { array: Array<{ dispose(): any }>; onDidDispose?: Function } = {
    array: [],
  };

  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }

  async execCommand(...rest: any[]) {
    const [node, command] = rest as [Deployment, string];
    if (!node) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }

    this.node = node;
    this.container = await this.getContainer();

    if (!command) {
      const status = await node.getStatus(true);

      if (status !== "developing") {
        vscode.commands.executeCommand(START_DEV_MODE, node, RUN);
        return;
      }
    }

    await this.startRun();
  }

  async syncComplete() {
    this.disposable.onDidDispose = this.startRun.bind(this);

    this.disposable.array[0].dispose();
  }

  async startRun() {
    this.disposable.onDidDispose = null;

    const { container, node } = this;
    const runCommand = (container.dev.command?.run ?? []).join(" ");
    const debugCommand = (container.dev.command?.debug ?? []).join(" ");

    const grepPattern: Array<string> = [];
    if (runCommand) {
      grepPattern.push(`-e '${runCommand}'`);
    }
    if (debugCommand) {
      grepPattern.push(`-e '${debugCommand}'`);
    }

    const grepStr = "grep " + grepPattern.join(" ");

    const podNames = await getRunningPodNames({
      name: node.name,
      kind: node.resourceType,
      namespace: node.getNameSpace(),
      kubeConfigPath: node.getKubeConfigPath(),
    });
    if (podNames.length < 1) {
      logger.info(`debug: not found pod`);
      return;
    }

    const command = await NhctlCommand.exec({
      namespace: node.getNameSpace(),
      kubeConfigPath: node.getKubeConfigPath(),
    });

    await exec({
      command: command.getCommand(),
      args: [
        podNames[0],
        `-c nocalhost-dev`,
        `-- bash -c "ps aux| ${grepStr}|grep -v grep|awk '{print \\$2}'|xargs kill -9"`,
      ],
      output: false,
    }).promise.catch(function () {});

    host.showProgressing("running ...", async () => {
      command.args = [
        podNames[0],
        "-it",
        `-c nocalhost-dev`,
        `-- bash -c "${debugCommand}"`,
      ];

      const resourceNode = node as KubernetesResourceNode;

      const liveReload = new LiveReload(
        {
          namespace: node.getNameSpace(),
          kubeConfigPath: node.getKubeConfigPath(),
          resourceType: resourceNode.resourceType,
          appName: node.getAppName(),
          workloadName: resourceNode.name,
        },
        this.syncComplete.bind(this)
      );

      const name = `${node.getAppName()}-${node.name}`;

      let terminals = vscode.window.terminals.filter((t) =>
        t.name.endsWith(name)
      );
      if (terminals.length) {
        terminals.forEach((t) => t.dispose());
      }

      const terminal = host.invokeInNewTerminal(
        command.getCommand(),
        "run:" + name
      );
      terminal.show();

      this.disposable.array.push(
        terminal,
        liveReload,
        vscode.window.onDidCloseTerminal((e) => {
          if (e.name === name) {
            this.disposable.array.forEach((d) => d.dispose());
            this.disposable.array.length = 0;

            this.disposable.onDidDispose && this.disposable.onDidDispose();
          }
        })
      );
    });
  }

  async getContainer() {
    let container: ContainerConfig | undefined;

    const serviceConfig = this.node.getConfig();
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

    this.validateRunConfig(container);

    return container;
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

    if (valid.errors.length > 0) {
      let message = "please check config.\n";
      valid.errors.forEach((e) => {
        message += `${e.property}: ${e.message} \n`;
      });
      throw new Error(message);
    }
  }
}
