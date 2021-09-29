import * as vscode from "vscode";
import * as JsonSchema from "json-schema";
import { ChildProcess, spawn, spawnSync } from "child_process";
import { NhctlCommand } from "./../ctl/nhctl";
import host from "../host";
import { Deployment } from "../nodes/workloads/controllerResources/deployment/Deployment";
import { ContainerConfig } from "../service/configService";
import { IDebugProvider } from "./IDebugprovider";
import { validate } from "json-schema";
import logger from "../utils/logger";
import { getRunningPodNames } from "../ctl/nhctl";

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
    const isInstalled = await debugProvider.isDebuggerInstalled();
    if (!isInstalled) {
      host.showInformationMessage("Please install golang extension.");
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
      host.showInformationMessage("Missing container configuration.");
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
    logger.info("[debug] getRunningPodNames");
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
    host.log("[debug] check required command", true);
    const notFoundCommands = debugProvider.checkRequiredCommand(
      podNames[0],
      node.getNameSpace(),
      node.getKubeConfigPath()
    );
    if (notFoundCommands.length > 0) {
      const msg =
        "Not found command in container: " + notFoundCommands.join(" ");
      host.showErrorMessage(msg);
      throw new Error(msg);
    }

    const debugCommand =
      (container.dev.command && container.dev.command.debug) || [];
    const terminatedCallback = async () => {
      if (!proc) {
        throw new Error("Cannot access proc");
      }
      if (!proc.killed) {
        proc.kill();
      }
      debugProvider.killContainerDebugProcess(
        podNames[0],
        node.getKubeConfigPath(),
        debugCommand,
        node.getNameSpace()
      );
      if (!containerProc.killed) {
        containerProc.kill();
      }
    };
    host.log("[debug] launch debug", true);
    const containerProc = this.enterContainer(
      podNames[0],
      node.getKubeConfigPath(),
      debugCommand,
      terminatedCallback,
      node.getNameSpace()
    );

    const cwd = workspaceFolder.uri.fsPath;
    if (!containerProc) {
      // proc.kill();
      return;
    }

    // wait launch success
    host.log("[debug] wait launch", true);
    await this.waitLaunch(
      port,
      podNames[0],
      node.getKubeConfigPath(),
      node.getNameSpace()
    ).catch((err) => {
      host.log("[debug] wait error");
      terminatedCallback();
      throw err;
    });

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

    host.log("[debug] wait port forward", true);
    await this.waitingPortForwardReady(proc).catch((err) => {
      terminatedCallback();
      throw err;
    });
    const workDir = container.dev.workDir || "/home/nocalhost-dev";

    host.log("[debug] start debug", true);
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
    execCommand: string[],
    terminatedCallback: Function,
    namespace: string
  ) {
    const command = `k exec ${podName} -c nocalhost-dev --kubeconfig ${kubeconfigPath} -n ${namespace} --`;
    const args = command.split(" ");
    args.push("bash", "-c", `${execCommand.join(" ")}`);

    const cmd = `${NhctlCommand.nhctlPath} ${args.join(" ")}`;
    logger.info(`[debug] ${cmd}`);
    host.log(`${cmd}`, true);
    const proc = spawn(NhctlCommand.nhctlPath, args);

    proc.stdout.on("data", function (data) {
      host.log(`${data}`);
    });
    proc.stderr.on("data", (data) => {
      host.log(`${data}`);
    });

    proc.on("close", async (code) => {
      await terminatedCallback();
      host.log("close debug container", true);
    });

    return proc;
  }

  public async portForward(props: {
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
    const command = `port-forward start ${appName} -d ${workloadName} --pod ${podName} -p ${port} --kubeconfig ${kubeconfigPath} -n ${namespace} --follow`;
    const cmd = `${NhctlCommand.nhctlPath} ${command}`;
    host.log(`[debug] port-forward: ${cmd}`, true);
    logger.info(`[debug] port-forward: ${cmd}`);
    const proc = spawn(NhctlCommand.nhctlPath, command.split(" "));

    return proc;
  }

  public waitingPortForwardReady(proc: ChildProcess) {
    const timeout = 10 * 1000;
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject("port-forward timeout");
      }, timeout);
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

  public async waitLaunch(
    port: number,
    podName: string,
    kubeconfigPath: string,
    namespace: string
  ) {
    function check() {
      const command = `k exec ${podName} -c nocalhost-dev --kubeconfig ${kubeconfigPath}  -n ${namespace} --`;
      const args = command.split(" ");

      args.push("bash", "-c", `netstat -tunlp | grep ${port}`);
      const cmd = args.join(" ");
      host.log(`debug： ${NhctlCommand.nhctlPath} ${cmd}`, true);
      logger.info(`[cmd]: ${cmd}`);
      const result = spawnSync(NhctlCommand.nhctlPath, args);
      if (`${result.stdout}`) {
        return true;
      }
      return false;
    }
    const timeout = 10 * 1000 * 60;
    const startTime = Date.now();
    let isLaunched = check();
    let isRunning = false;
    if (!isLaunched) {
      while (Date.now() - startTime < timeout && !isLaunched) {
        if (isRunning) {
          return;
        }
        isRunning = true;
        await host.delay(1000);
        isLaunched = check();
        isRunning = false;
      }
    }
    if (isLaunched) {
      host.log(`[debug] launch success`, true);
      return true;
    } else {
      host.log(`[debug] launch error`, true);
      throw new Error("timeout");
    }
  }
}
