import * as vscode from "vscode";
import * as assert from "assert";
import * as AsyncRetry from "async-retry";

import { IDebugProvider } from "../IDebugProvider";
import logger from "../../../utils/logger";
import { JDWP } from "./jdwp";

export class JavaDebugProvider extends IDebugProvider {
  name: string = "Java";
  requireExtensions: string[] = ["vscjava.vscode-java-debug", "redhat.java"];

  downloadUrl: string = "https://adoptopenjdk.net/";
  commandName: string = "java";

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
  async checkExtensionDependency() {
    if (
      !vscode.workspace.getConfiguration().get("java.home") &&
      !process.env["JDK_HOME"] &&
      !process.env["JAVA_HOME"]
    ) {
      const choice = await vscode.window.showErrorMessage(
        "The java debugging requires a Java 11 Development Kit to run (not the JRE!). You need to configure the 'JDK'",
        "View Documents"
      );

      if (choice === "View Documents") {
        const uri = vscode.Uri.parse(
          "https://github.com/redhat-developer/vscode-java/wiki/JDK-Requirements#setting-the-jdk"
        );
        vscode.env.openExternal(uri);
      }

      return Promise.reject();
    }
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
    const jdwp = await JDWP.connect(port, 2);

    const result = await jdwp.getVersion();
    assert(result);

    logger.debug("jdwp version", result);

    await jdwp.destroy();
  }
}
