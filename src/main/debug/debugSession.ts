import * as vscode from "vscode";
import * as JsonSchema from "json-schema";
import { spawn } from "child_process";
import { validate } from "json-schema";

import { NhctlCommand, getRunningPodNames } from "./../ctl/nhctl";
import host from "../host";
import { Deployment } from "../nodes/workloads/controllerResources/deployment/Deployment";
import { ContainerConfig } from "../service/configService";
import { IDebugProvider } from "./IDebugprovider";
import logger from "../utils/logger";

export class DebugSession {
  public async launch(
    workspaceFolder: vscode.WorkspaceFolder,
    debugProvider: IDebugProvider,
    node: Deployment
  ) {
    if (!workspaceFolder) {
      return;
    }

    const isInstalled = await debugProvider.isDebuggerInstalled();
    if (!isInstalled) {
      host.showInformationMessage("please install dependent extension.");
      return;
    }

    let container: ContainerConfig = await DebugSession.getContainer(node);

    const port =
      (container.dev.debug && container.dev.debug.remoteDebugPort) || 9229;

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

    // host.log("[debug] check required command", true);
    // const notFoundCommands = debugProvider.checkRequiredCommand(
    //   podNames[0],
    //   node.getNameSpace(),
    //   node.getKubeConfigPath()
    // );
    // if (notFoundCommands.length > 0) {
    //   const msg =
    //     "Not found command in container: " + notFoundCommands.join(" ");
    //   host.showErrorMessage(msg);
    //   throw new Error(msg);
    // }

    const debugCommand =
      (container.dev.command && container.dev.command.debug) || [];

    host.log("[debug] launch debug", true);
    const debugProc = this.enterContainer(
      node.getKubeConfigPath(),
      debugCommand,
      node.getNameSpace(),
      node
    );

    const cwd = workspaceFolder.uri.fsPath;

    host.log("[debug] port forward", true);

    const proc = await this.portForward({
      port: `${port}:${port}`,
      appName: node.getAppName(),
      podName: podNames[0],
      kubeconfigPath: node.getKubeConfigPath(),
      namespace: node.getNameSpace(),
      workloadName: node.name,
      resourceType: node.resourceType,
    });
    if (!proc) {
      return;
    }

    const workDir = container.dev.workDir || "/home/nocalhost-dev";

    host.log("[debug] start debug", true);

    const terminatedCallback = async () => {
      if (!debugProc.killed) {
        debugProc.stdin.write("\x03");
      }
    };

    const success = await debugProvider.startDebug(
      cwd,
      `${Date.now()}`,
      port,
      workDir,
      terminatedCallback
    );

    if (!success) {
      terminatedCallback();
    }
  }
  static async getContainer(node: Deployment) {
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

    DebugSession.validateDebugConfig(container);

    return container;
  }

  static validateDebugConfig(config: ContainerConfig) {
    const schema: JsonSchema.JSONSchema6 = {
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

    const valid = validate(config, schema);

    if (valid.errors.length > 0) {
      let message = "please check config.\n";
      valid.errors.forEach((e) => {
        message += `${e.property}: ${e.message} \n`;
      });
      throw new Error(message);
    }
  }

  enterContainer(
    kubeconfigPath: string,
    execCommand: string[],
    namespace: string,
    node: Deployment
  ) {
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
      `${execCommand.join(" ")}`,
      "--kubeconfig",
      kubeconfigPath,
      "-n",
      namespace,
    ];

    const cmd = `${NhctlCommand.nhctlPath} ${args.join(" ")}`;
    logger.info(`[debug] ${cmd}`);
    host.log(`${cmd}`, true);

    const proc = spawn(NhctlCommand.nhctlPath, args, { shell: true });
    proc.stdout.on("data", function (data) {
      host.log(`${data}`);
    });
    proc.stderr.on("data", (data) => {
      host.log(`${data}`);
    });
    proc.on("close", async (code) => {
      host.log(`close debug container code:${code}`, true);
    });

    return proc;
  }

  async portForward(props: {
    port: string;
    appName: string;
    workloadName: string;
    resourceType: string;
    podName: string;
    kubeconfigPath: string;
    namespace: string;
  }) {
    const {
      port,
      workloadName,
      appName,
      podName,
      kubeconfigPath,
      namespace,
    } = props;
    const command = `port-forward start ${appName} -d ${workloadName} --pod ${podName} -p ${port} --kubeconfig ${kubeconfigPath} -n ${namespace}`;
    const cmd = `${NhctlCommand.nhctlPath} ${command}`;
    host.log(`[debug] port-forward: ${cmd}`, true);
    logger.info(`[debug] port-forward: ${cmd}`);
    const proc = spawn(NhctlCommand.nhctlPath, command.split(" "));

    return proc;
  }
}
