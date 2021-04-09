import * as vscode from "vscode";
import * as JsonSchema from "json-schema";

import ICommand from "./ICommand";
import { RUN } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { Deployment } from "../nodes/workloads/controllerResources/deployment/Deployment";
import { validate } from "json-schema";
import { ContainerConfig } from "../service/configService";

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
  async execCommand(node: Deployment) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    await host.showProgressing("running ...", async () => {
      const workspaceFolder = await host.showWorkspaceFolderPick();
      if (!workspaceFolder) {
        host.showInformationMessage("no workspacefolder");
        return;
      }
      const serviceConfig = node.getConfig();
      const containers = (serviceConfig && serviceConfig.containers) || [];
      let container: ContainerConfig | undefined;
      if (containers.length > 1) {
        const containerNames = containers.map((c) => c.name);
        const containerName = await vscode.window.showQuickPick(containerNames);
        if (!containerName) {
          return;
        }
        container = containers.filter((c) => {
          if (c.name === containerName) {
            return true;
          }
          return false;
        })[0];
      } else if (containers.length === 1) {
        container = containers[0];
      } else {
        host.showInformationMessage("Missing container confiuration");
        return;
      }
      const valid = this.validateRunConfig(container);
      if (valid.errors.length > 0) {
        let message = "please check config.\n";
        valid.errors.forEach((e) => {
          message += `${e.property}: ${e.message} \n`;
        });
        host.showErrorMessage(`${message}`);
        return;
      }
      const appNode = node.getAppNode();
      await this.exec({
        appName: node.getAppName(),
        workload: node.name,
        resourceType: node.resourceType,
        commands: container.dev.command.run || [],
        namespace: appNode.namespace,
        kubeConfigPath: node.getKubeConfigPath(),
      }).catch(() => {});
    });
  }
  async exec(param: ExecCommandParam) {
    const terminalCommands = new Array<string>();
    terminalCommands.push("exec", param.appName);
    terminalCommands.push("-d", param.workload);
    param.commands.forEach((c) => {
      terminalCommands.push("-c", c);
    });
    terminalCommands.push("-n", param.namespace);
    terminalCommands.push("--kubeconfig", param.kubeConfigPath);
    const shellPath = "nhctl";

    const terminal = host.invokeInNewTerminal(
      `${shellPath} ${terminalCommands.join(" ")}`,
      `${param.appName}/${param.workload}:run`
    );

    // const terminal = host.invokeInNewTerminalSpecialShell(
    //   terminalCommands,
    //   process.platform === "win32" ? `${shellPath}.exe` : shellPath,
    //   `${param.appName}/${param.workload}:run`
    // );
    terminal.show();
  }

  public validateRunConfig(config: ContainerConfig) {
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

    const result = validate(config, schema);
    return result;
  }
}
