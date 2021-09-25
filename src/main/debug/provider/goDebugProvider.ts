import * as assert from "assert";
import { Client } from "json-rpc2";
import { DebugConfiguration } from "vscode";
const retry = require("async-retry");

import { IDebugProvider } from "./";

export class GoDebugProvider implements IDebugProvider {
  name: string;
  requireExtensions: string[];
  constructor() {
    this.name = "golang";
    this.requireExtensions = ["golang.go"];
  }
  async getDebugConfiguration(
    name: string,
    port: number,
    remoteRoot: string
  ): Promise<DebugConfiguration> {
    await this.waitForDebug(port);

    return {
      name,
      type: "go",
      request: "attach",
      mode: "remote",
      remotePath: remoteRoot,
      port,
      host: "127.0.0.1",
      // trace: "verbose", // check debug step
      // NOT SUPPORT CWD, will occur error
    };
  }

  async connectClient(client: Client) {
    return new Promise((res, rej) => {
      setTimeout(() => rej(new Error("connect client timeout")), 3 * 1000);

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
  async waitForDebug(port: number) {
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
