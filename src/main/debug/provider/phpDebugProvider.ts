import * as assert from "assert";
import * as vscode from "vscode";
import * as getPort from "get-port";

import { getPodNames, NhctlCommand } from "../../ctl/nhctl";
import { exec } from "../../ctl/shell";
import { ControllerResourceNode } from "../../nodes/workloads/controllerResources/ControllerResourceNode";
import { ContainerConfig } from "../../service/configService";
import logger from "../../utils/logger";
import { SocketDebugClient } from "../SocketDebugClient";

import { IDebugProvider } from "./IDebugProvider";

export class PhpDebugProvider extends IDebugProvider {
  name: string = "php";
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
    const podNameArr = await getPodNames({
      name: node.name,
      kind: node.resourceType,
      namespace: node.getNameSpace(),
      kubeConfigPath: node.getKubeConfigPath(),
    });

    let podName = podNameArr[0];
    if (podNameArr.length > 1) {
      podName = await vscode.window.showQuickPick(podNameArr);
    }

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
  async waitDebuggerStart(port: number): Promise<any> {
    const debugClient = new SocketDebugClient(port);
    await debugClient.connect(2);

    const result = await debugClient.request("debugpySystemInfo", null, 2);

    assert(result.success);

    logger.debug("debugpy debugpySystemInfo", result);

    debugClient.destroy();
  }
}
