import * as assert from "assert";
const retry = require("async-retry");
const rpc = require("json-rpc2");

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
  async connectClient(port: number, host: string) {
    // Add a slight delay to avoid issues on Linux with
    // Delve failing calls made shortly after connection.
    return new Promise((res, rej) => {
      setTimeout(() => {
        const client = rpc.Client.$create(port, host);

        client.connectSocket((err: any, conn: any) => {
          if (err) {
            return rej(err);
          }
          return res(conn);
        });
        client.on("error", rej);
      }, 200);
    }).then((conn: any) => {
      return new Promise((res, rej) => {
        conn.call(
          "RPCServer.GetVersion",
          null,
          function (err: any, result: any) {
            if (err) {
              return rej(err);
            }
            res(result);
          }
        );
      });
    });
  }
  async waitForDebug(port: number) {
    await retry(
      async () => {
        const result = await this.connectClient(port, "127.0.0.1");
        assert.ok(
          result,
          "The attempt to connect to the remote debug port timed out."
        );
      },
      {
        randomize: false,
        retries: 6,
      }
    );
  }
}
