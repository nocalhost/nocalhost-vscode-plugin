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

      const name = `run:${node.getAppName()}-${node.label}`;

      const terminal = host.invokeInNewTerminal(cmd, name);
      terminal.show();
    });
  }

  killContainerDebugProcess(
    podName: string,
    kubeconfigPath: string,
    execCommand: string[],
    namespace: string
  ) {
    const command = `k exec ${podName} -c nocalhost-dev --kubeconfig ${kubeconfigPath} -n ${namespace} --`;
    const args = command.split(" ");
    const sliceCommands = execCommand.join(" ");

    const killCommand = `kill -9 \`ps aux|grep -i '${sliceCommands}'|grep -v grep|awk '{print $2}'\``;

    args.push("bash", "-c", `${killCommand}`);

    const cmd = `${NhctlCommand.nhctlPath} ${args.join(" ")}`;
    host.log(`[debug] ${cmd}`, true);
    logger.error(`[cmd]: ${cmd}`);

    spawnSync(NhctlCommand.nhctlPath, args);
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
