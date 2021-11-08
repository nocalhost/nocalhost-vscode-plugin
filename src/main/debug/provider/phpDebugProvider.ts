import * as vscode from "vscode";
import * as getPort from "get-port";

import { NhctlCommand } from "../../ctl/nhctl";
import { exec } from "../../ctl/shell";
import { ControllerResourceNode } from "../../nodes/workloads/controllerResources/ControllerResourceNode";
import { ContainerConfig } from "../../service/configService";

import { IDebugProvider } from "./IDebugProvider";

export class PhpDebugProvider extends IDebugProvider {
  name: string = "Php";
  requireExtensions: string[] = ["felixfbecker.php-debug"];

  getDebugConfiguration(
    name: string,
    port: number,
    remotePath: string
  ): vscode.DebugConfiguration {
    // https://github.com/xdebug/vscode-php-debug
    return {
      type: "php",
      name,
      request: "launch",
      hostName: "localhost",
      port,
      pathMappings: {
        [remotePath]: "${workspaceFolder}",
      },
    };
  }
  async getRemotePort(
    node: ControllerResourceNode,
    container: ContainerConfig
  ) {
    const podName = await NhctlCommand.dev(
      {
        namespace: node.getNameSpace(),
        kubeConfigPath: node.getKubeConfigPath(),
      },
      null,
      ["pod", node.appName, `-t ${node.resourceType}`, `-d ${node.name}`]
    ).exec();

    const { remoteDebugPort } = container.dev.debug;
    const port = await getPort();

    const { proc } = exec({
      command: NhctlCommand.nhctlPath,
      args: [
        "ssh",
        "reverse",
        `--local ${port}`,
        `--pod ${podName}`,
        `--remote ${remoteDebugPort}`,
        `-n ${node.getNameSpace()}`,
        `--kubeconfig ${node.getKubeConfigPath()}`,
      ],
      output: true,
    });
    proc.on("exit", (code, signal) => {
      if (code !== 0) {
      }
    });

    let dispose = () => {
      return new Promise<void>((res) => {
        proc.once("exit", res);
        proc.kill();
      });
    };

    return { port, dispose };
  }
}
