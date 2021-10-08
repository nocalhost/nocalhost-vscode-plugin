import * as assert from "assert";
import { CancellationTokenSource, DebugConfiguration } from "vscode";
import * as AsyncRetry from "async-retry";

import { ControllerResourceNode } from "../../nodes/workloads/controllerResources/ControllerResourceNode";
import { ContainerConfig } from "../../service/configService";
import { IDebugProvider } from "./IDebugProvider";

export class PythonDebugProvider extends IDebugProvider {
  name: string;
  requireExtensions: string[];
  constructor() {
    super();
    this.name = "Python";
    this.requireExtensions = ["ms-python.python"];
  }
  getDebugConfiguration(
    name: string,
    port: number,
    remoteRoot: string
  ): DebugConfiguration {
    // https://github.com/xdebug/vscode-php-debug
    return {
      name,
      type: "python",
      request: "attach",
      pathMappings: [
        {
          localRoot: "${workspaceFolder}",
          remoteRoot,
        },
      ],
      connect: {
        port,
        host: "127.0.0.1",
      },
    };
  }
  async startDebugging(
    workspaceFolder: string,
    debugSessionName: string,
    container: ContainerConfig,
    port: number,
    node: ControllerResourceNode,
    cancellationToken?: CancellationTokenSource
  ): Promise<boolean> {
    return await AsyncRetry(
      async (bail) => {
        if (cancellationToken.token.isCancellationRequested) {
          bail(new Error());
          return;
        }
        const result = await super.startDebugging(
          workspaceFolder,
          debugSessionName,
          container,
          port,
          node
        );
        assert.ok(
          result,
          "The attempt to connect to the remote debug port timed out."
        );

        return result;
      },
      {
        randomize: false,
        retries: 6,
      }
    );
  }
}
