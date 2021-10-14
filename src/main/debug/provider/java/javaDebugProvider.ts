import * as vscode from "vscode";
import * as assert from "assert";

import { IDebugProvider } from "../IDebugProvider";
import logger from "../../../utils/logger";
import { JDWP } from "./jdwp";

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
    if (this.jdwp && this.jdwp.socket.connecting) {
      return Promise.resolve();
    }

    this.jdwp = await JDWP.connect(port, timeout);
  }
  async waitDebuggerStart(port: number): Promise<any> {
    await this.connect(port, 2);

    // const result = await this.jdwp.call({ command: 1, commandSet: 1 }, 2);

    // assert(result);

    // logger.debug("jdwp version", result);

    this.jdwp.socket.end();
    this.jdwp = null;
  }
}
