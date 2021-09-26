import * as assert from "assert";
import { Client } from "json-rpc2";
import { DebugConfiguration } from "vscode";
const retry = require("async-retry");

import { ControllerResourceNode } from "../../nodes/workloads/controllerResources/ControllerResourceNode";
import { ContainerConfig } from "../../service/configService";
import { IDebugProvider } from "./IDebugProvider";

export class GoDebugProvider extends IDebugProvider {
  name: string;
  requireExtensions: string[];
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
    node: ControllerResourceNode,
    podName: string
  ): Promise<boolean> {
    await this.waitForReady(container.dev.debug.remoteDebugPort);

    return super.startDebugging(
      workspaceFolder,
      debugSessionName,
      container,
      node,
      podName
    );
  }

  async connectClient(client: Client) {
    return new Promise((res, rej) => {
      setTimeout(() => {
        rej(
          new Error(
            "The attempt to connect to the remote debug port timed out."
          )
        );
      }, 3 * 1000);

      client.connectSocket((err, conn) => {
        if (err) {
          rej(err);
        }
        conn.call("RPCServer.GetVersion", [], function (err: any, result: any) {
          if (err) {
            rej(err);
            return;
          }
          res(result);
        });
      });
    });
  }
  async waitForReady(port: number) {
    const client = Client.$create(port, "127.0.0.1");

    await retry(
      async () => {
        const result = await this.connectClient(client);
        assert.ok(
          result,
          "The attempt to connect to the remote debug port timed out."
        );
      },
      {
        randomize: false,
        retries: 3,
      }
    );
  }
}
