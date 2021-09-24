import * as assert from "assert";
import { Client } from "json-rpc2";
const retry = require("async-retry");

import { IDebugProvider } from "./iDebugProvider";

export class GoDebugProvider extends IDebugProvider {
  name = "golang";
  requireExtensions = ["golang.go"];

  async startDebug(
    workspaceFolder: string,
    sessionName: string,
    port: number,
    workDir: string
  ): Promise<boolean> {
    await this.waitForDebug(port);

    const debugConfiguration = {
      name: sessionName,
      type: "go",
      request: "attach",
      mode: "remote",
      remotePath: workDir || "/home/nocalhost-dev/",
      port,
      host: "127.0.0.1",
      // trace: "verbose", // check debug step
      // NOT SUPPORT CWD, will occur error
    };

    return super.startDebugging(workspaceFolder, debugConfiguration);
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
