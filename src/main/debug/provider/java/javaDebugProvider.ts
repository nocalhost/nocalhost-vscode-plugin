import * as vscode from "vscode";
import * as assert from "assert";
import * as AsyncRetry from "async-retry";

import { IDebugProvider } from "../IDebugProvider";
import logger from "../../../utils/logger";
import { JDWP } from "./jdwp";
import host from "../../../host";

export class JavaDebugProvider extends IDebugProvider {
  name: string = "Java";
  requireExtensions: string[] = ["vscjava.vscode-java-debug", "redhat.java"];

  jdwp: JDWP;
  getDebugConfiguration(
    name: string,
    port: number,
    remotePath: string
  ): vscode.DebugConfiguration {
    // https://code.visualstudio.com/docs/java/java-debugging
    return {
      type: "java",
      name,
      request: "attach",
      hostName: "localhost",
      port,
    };
  }
  private async connect(port: number, timeout: number = 0) {
    if (this.jdwp) {
      return Promise.resolve();
    }

    this.jdwp = await JDWP.connect(port, timeout);
  }
  async waitDebuggerStop() {
    await AsyncRetry(
      async () => {
        assert(!vscode.debug.activeDebugSession);
      },
      {
        randomize: false,
        maxTimeout: 1000,
        retries: 10,
      }
    );
    return Promise.resolve();
  }
  async waitDebuggerStart(port: number): Promise<any> {
    await this.connect(port, 10);

    const result = await this.jdwp.getVersion();
    assert(result);

    logger.debug("jdwp version", result);

    await this.jdwp.destroy();
  }
}
