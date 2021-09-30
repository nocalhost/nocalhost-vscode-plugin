import * as assert from "assert";
import { Client, RPCConnection } from "json-rpc2";
import { CancellationTokenSource, DebugConfiguration } from "vscode";
import * as AsyncRetry from "async-retry";

import { ControllerResourceNode } from "../../nodes/workloads/controllerResources/ControllerResourceNode";
import { ContainerConfig } from "../../service/configService";
import logger from "../../utils/logger";
import host from "../../host";
import { IDebugProvider } from "./IDebugProvider";

export class GoDebugProvider extends IDebugProvider {
  name: string;
  requireExtensions: string[];
  client: Client;
  connection: RPCConnection;
  constructor() {
    super();
    this.name = "Golang";
    this.requireExtensions = ["golang.go"];
  }

  getDebugConfiguration(
    name: string,
    port: number,
    remoteRoot: string
  ): DebugConfiguration {
    // https://github.com/golang/vscode-go/blob/master/docs/debugging.md
    return {
      name,
      type: "go",
      request: "attach",
      mode: "remote",
      remotePath: remoteRoot,
      port,
      host: "127.0.0.1",
    };
  }
  async startDebugging(
    workspaceFolder: string,
    debugSessionName: string,
    container: ContainerConfig,
    port: number,
    node: ControllerResourceNode,
    cancellationToken: CancellationTokenSource
  ): Promise<boolean> {
    await this.waitForReady(port, cancellationToken);

    return super.startDebugging(
      workspaceFolder,
      debugSessionName,
      container,
      port,
      node,
      cancellationToken
    );
  }
  async waitStopDebug() {
    try {
      await this.callPromise("Command", [{ name: "halt" }]);
      await this.callPromise("Detach", []);
      (this.connection as any)["conn"]["end"]();
    } catch (err) {
      logger.error("stopDebug error", err);

      host.showErrorMessage(
        "Stop dlv fail,please kill the dlv process in the container."
      );
    }
  }
  async connectClient() {
    return new Promise<RPCConnection>((res, rej) => {
      this.client.connectSocket((err, conn) => {
        if (err) {
          rej(err);
          return;
        }
        res(conn);
      });
    });
  }

  callPromise<T>(command: string, args: any[], timeout = 0): Thenable<T> {
    return new Promise<T>((resolve, reject) => {
      if (timeout) {
        setTimeout(() => {
          reject(new Error(`Then Call RPCServer ${command} timed out.`));
        }, timeout * 1000);
      }

      this.connection.call<T>(`RPCServer.${command}`, args, (err, res) => {
        return err ? reject(err) : resolve(res);
      });
    });
  }

  async waitForReady(port: number, cancellationToken: CancellationTokenSource) {
    this.client = Client.$create(port, "127.0.0.1");

    await AsyncRetry(
      async (bail) => {
        if (cancellationToken.token.isCancellationRequested) {
          bail(new Error());
          return;
        }
        this.connection = await this.connectClient();
        try {
          const result = await this.callPromise("GetVersion", [], 3);

          assert.ok(
            result,
            "The attempt to connect to the remote debug port timed out."
          );
        } catch (err) {
          (this.connection as any)["conn"]["end"]();
          this.connection = null;

          throw err;
        }
      },
      {
        randomize: false,
        retries: 6,
      }
    );
  }
}
