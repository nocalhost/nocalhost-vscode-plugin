import * as assert from "assert";
const retry = require("async-retry");
const isPortReachable = require("is-port-reachable");

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

  async waitForDebug(port: number) {
    await retry(
      async () => {
        const isReachable = await isPortReachable(port, {
          host: "127.0.0.1",
        });
        assert.ok(
          isReachable,
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
