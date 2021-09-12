import * as vscode from "vscode";
import * as JsonSchema from "json-schema";
import { spawnSync } from "child_process";

import ICommand from "./ICommand";
import { RUN, START_DEV_MODE } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { Deployment } from "../nodes/workloads/controllerResources/deployment/Deployment";
import { validate } from "json-schema";
import { ContainerConfig } from "../service/configService";
import { NhctlCommand } from "../ctl/nhctl";
import logger from "../utils/logger";
import { LiveReload } from "../debug/liveReload";
import { KubernetesResourceNode } from "../nodes/abstract/KubernetesResourceNode";

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

  startRun() {
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

    const killCommand = `ps aux| ${grepStr}|grep -v grep|awk '{print $2}'|xargs kill -9`;

    spawnSync(NhctlCommand.nhctlPath, [
      "exec",
      node.getAppName(),
      "-d",
      node.label,
      "--command",
      "sh",
      "--command",
      "-c",
      "--command",
      killCommand,
      "--kubeconfig",
      node.getKubeConfigPath(),
      "-n",
      node.getNameSpace(),
      ,
    ]);

    host.showProgressing("running ...", async () => {
      const args = [
        "exec",
        node.getAppName(),
        "-d",
        node.label,
        "--command",
        "sh",
        "--command",
        "-c",
        "--command",
        runCommand,
        "--kubeconfig",
        node.getKubeConfigPath(),
        "-n",
        node.getNameSpace(),
      ];

      const cmd = `${NhctlCommand.nhctlPath} ${args.join(" ")}`;
      logger.info(`[run] ${cmd}`);
      host.log(`${cmd}`, true);

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

      const name = `run`;

      const terminal = host.invokeInNewTerminal(cmd, name);
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
