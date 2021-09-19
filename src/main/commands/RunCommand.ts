import * as vscode from "vscode";
import * as JsonSchema from "json-schema";
import { spawnSync } from "child_process";
import * as assert from "assert";

import ICommand from "./ICommand";
import { RUN, START_DEV_MODE } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { Deployment } from "../nodes/workloads/controllerResources/deployment/Deployment";
import { validate } from "json-schema";
import { ContainerConfig } from "../service/configService";
import { getRunningPodNames, NhctlCommand } from "../ctl/nhctl";
import { LiveReload } from "../debug/liveReload";
import { KubernetesResourceNode } from "../nodes/abstract/KubernetesResourceNode";
import { exec } from "../ctl/shell";
import { ExecOutputReturnValue } from "shelljs";

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
  static async checkRequiredCommand(
    podName: string,
    namespace: string,
    kubeconfigPath: string
  ) {
    host.log("[debug] check required command", true);

    function check(requiredCommand: string) {
      const command = `k exec ${podName} -c nocalhost-dev --kubeconfig ${kubeconfigPath} -n ${namespace}  --`;
      const args = command.split(" ");

      args.push(`which ${requiredCommand}`);

      const result = spawnSync(NhctlCommand.nhctlPath, args);

      return result.stdout;
    }

    const notFound: Array<string> = [];
    ["ps", "awk"].forEach((c) => {
      const r = check(c);
      if (!r) {
        notFound.push(c);
      }
    });

    assert.strictEqual(
      notFound.length,
      0,
      "Not found command in container: " + notFound.join(" ")
    );
  }
  static async killContainerCommandProcess(
    container: ContainerConfig,
    node: Deployment,
    podName: string
  ) {
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

    const command = await NhctlCommand.exec({
      namespace: node.getNameSpace(),
      kubeConfigPath: node.getKubeConfigPath(),
    });

    const { code, stdout } = (await exec({
      command: command.getCommand(),
      args: [
        podName,
        `-c nocalhost-dev`,
        `-- bash -c "ps aux| ${grepStr}|grep -v grep|awk '{print \\$2}'"`,
      ],
    }).promise.catch((err) => err)) as ExecOutputReturnValue;

    assert.strictEqual(0, code, "find command error");

    if (stdout) {
      const { code, stderr } = (await exec({
        command: command.getCommand(),
        args: [
          podName,
          `-c nocalhost-dev`,
          `-- bash -c "kill -9 ${stdout.split("\n").join(" ")}"`,
        ],
      }).promise.catch((err) => err)) as ExecOutputReturnValue;

      assert.strictEqual(0, code, "kill command error");
    }
    return Promise.resolve();
  }
  async syncComplete() {
    this.disposable.onDidDispose = this.startRun.bind(this);

    this.disposable.array[0].dispose();
  }

  async startRun() {
    this.disposable.onDidDispose = null;

    const { container, node } = this;

    host.showProgressing("running ...", async () => {
      const runCommand = (container.dev.command?.run ?? []).join(" ");

      const podNames = await getRunningPodNames({
        name: node.name,
        kind: node.resourceType,
        namespace: node.getNameSpace(),
        kubeConfigPath: node.getKubeConfigPath(),
      });

      assert.strictEqual(podNames.length, 1, "not found pod");

      await RunCommand.killContainerCommandProcess(
        container,
        node,
        podNames[0]
      );

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

      const name = "run:" + `${node.getAppName()}-${node.name}`;

      let terminal = vscode.window.terminals.find((t) => t.name === name);
      if (terminal) {
        terminal.sendText("clear");
        terminal.sendText(command.getCommand());
        terminal.show();
        return;
      } else {
        terminal = host.invokeInNewTerminal(command.getCommand(), name);
        this.disposable.array.push(
          terminal,
          liveReload,
          vscode.window.onDidCloseTerminal((e) => {
            if (e.name === name && e.processId === terminal.processId) {
              this.disposable.array.forEach((d) => d.dispose());
              this.disposable.array.length = 0;

              this.disposable.onDidDispose && this.disposable.onDidDispose();
            }
          })
        );
      }
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
