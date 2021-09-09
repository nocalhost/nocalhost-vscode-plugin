import * as vscode from "vscode";
import * as JsonSchema from "json-schema";
import * as path from "path";

import ICommand from "./ICommand";
import { RUN, START_DEV_MODE } from "./constants";
import { NH_BIN } from "../constants";
import registerCommand from "./register";
import host from "../host";
import { Deployment } from "../nodes/workloads/controllerResources/deployment/Deployment";
import { validate } from "json-schema";
import { ContainerConfig } from "../service/configService";
import { NhctlCommand } from "../ctl/nhctl";
import logger from "../utils/logger";

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
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(...rest: any[]) {
    const [node, command] = rest as [Deployment, string];
    if (!node) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }
    const container = await this.getContainer(node);

    if (!command) {
      const status = await node.getStatus(true);

      if (status !== "developing") {
        vscode.commands.executeCommand(START_DEV_MODE, node, RUN);
        return;
      }
    }

    this.startRun(node, container);
  }

  startRun(node: Deployment, container: ContainerConfig) {
    host.showProgressing("running ...", async () => {
      const args = [
        "exec",
        node.getAppName(),
        "-d",
        node.label,
        "--command",
        "bash",
        "--command",
        "-c",
        "--command",
        `${(container.dev.command?.run ?? []).join(" ")}`,
        "--kubeconfig",
        node.getKubeConfigPath(),
        "-n",
        node.getNameSpace(),
      ];

      const cmd = `${NhctlCommand.nhctlPath} ${args.join(" ")}`;
      logger.info(`[run] ${cmd}`);
      host.log(`${cmd}`, true);

      const name = `run---${node.getAppName()}-${node.label}`;

      const terminal = host.invokeInNewTerminal(cmd, name);
      terminal.show();

      vscode.window.onDidCloseTerminal((e) => {
        if (e.name === name) {
          terminal.sendText("\x03");
          terminal.hide();
        }
      });
    });
  }

  async getContainer(node: Deployment) {
    let container: ContainerConfig | undefined;

    const serviceConfig = node.getConfig();
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
