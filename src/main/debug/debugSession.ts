import * as vscode from "vscode";
import * as JsonSchema from "json-schema";
import { ChildProcess, spawn, spawnSync } from "child_process";

import host from "../host";
import { Deployment } from "../nodes/workloads/controllerResources/deployment/Deployment";
import { ContainerConfig } from "../service/configService";
import { IDebugProvider } from "./IDebugprovider";
import { validate } from "json-schema";
import logger from "../utils/logger";
import * as kubectl from "../ctl/kubectl";

export class DebugSession {
  public async launch(
    workspaceFolder: vscode.WorkspaceFolder,
    debugProvider: IDebugProvider,
    node: Deployment
  ) {
    // launch debug
    if (!workspaceFolder) {
      return;
    }
    // if enter dev mode
    if (!node.isDeveloping) {
      host.showWarnMessage("Not in DevMode");
      return;
    }
    const isInstalled = await debugProvider.isDebuggerInstalled();
    if (!isInstalled) {
      host.showInformationMessage("please install golang extension.");
      return;
    }
    // port-forward debug port
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
    const valid = this.validateDebugConfig(container);
    if (valid.errors.length > 0) {
      let message = "please check config.\n";
      valid.errors.forEach((e) => {
        message += `${e.property}: ${e.message} \n`;
      });
      host.showErrorMessage(`${message}`);
      return;
    }
    const port =
      (container.dev.debug && container.dev.debug.remoteDebugPort) || 9229;
    const podNames = await kubectl.getRunningPodNames(
      node.name,
      node.resourceType,
      node.getKubeConfigPath()
    );
    if (podNames.length < 1) {
      logger.info(`debug: not found pod`);
      return;
    }
    const proc = await this.portForward(
      `${port}:${port}`,
      podNames[0],
      node.getKubeConfigPath()
    );
    if (!proc) {
      return;
    }
    await this.waitingPortForwardReady(proc);
    const devspaceName = node.getSpaceName();
    const appName = node.getAppName();
    host.pushDispose(devspaceName, appName, node.name, { dispose: proc.kill });

    const debugCommand =
      (container.dev.command && container.dev.command.debug) || [];

    const containerProc = this.enterContainer(
      podNames[0],
      node.getKubeConfigPath(),
      debugCommand
    );

    const cwd = workspaceFolder.uri.fsPath;
    if (!containerProc) {
      proc.kill();
      return;
    }

    const terminatedCallback = async () => {
      if (!proc.killed) {
        proc.kill();
      }
      debugProvider.killContainerDebugProcess(
        podNames[0],
        node.getKubeConfigPath(),
        debugCommand
      );
      if (!containerProc.killed) {
        containerProc.kill();
      }
    };
    const workDir = container.dev.workDir || "/home/nocalhost-dev";
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

  public validateDebugConfig(config: ContainerConfig) {
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

    const result = validate(config, schema);
    return result;
  }

  public enterContainer(
    podName: string,
    kubeconfigPath: string,
    execCommand: string[]
  ) {
    const command = `exec ${podName} -c nocalhost-dev --kubeconfig ${kubeconfigPath} --`;
    const args = command.split(" ");
    args.push("bash", "-c", `${execCommand.join(" ")}`);

    host.log("debug: " + `${args.join(" ")}`);
    const proc = spawn(`kubectl`, args);

    proc.stdout.on("data", function (data) {
      host.log(`${data}`);
    });
    proc.stderr.on("data", (data) => {
      host.log(`${data}`);
    });

    proc.on("close", async (code) => {
      host.log("close debug container", true);
    });

    return proc;
  }

  public async portForward(
    port: string,
    podName: string,
    kubeconfigPath: string
  ) {
    const command = `port-forward ${podName} ${port} --kubeconfig ${kubeconfigPath}`;
    host.log("port-forward: " + `kubectl ${command}`, true);
    const proc = spawn(`kubectl`, command.split(" "));

    return proc;
  }

  public waitingPortForwardReady(proc: ChildProcess) {
    return new Promise((resolve, reject) => {
      proc.stdout?.on("data", function (data) {
        const forwardingRegExp = /Forwarding\s+from\s+127\.0\.0\.1:/;
        const message = `${data}`;
        host.log(`${data}`);
        const res = forwardingRegExp.test(message);
        if (res) {
          resolve(res);
        }
      });
      proc.stderr?.on("data", (data) => {
        host.log(`port-forward: ${data}`, true);
      });

      proc.on("close", async (code) => {
        host.log("close debug port-forward", true);
        reject("Cannot setup port-forward.");
      });
    });
  }
}
