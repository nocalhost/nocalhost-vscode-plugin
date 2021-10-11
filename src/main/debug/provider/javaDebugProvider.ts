import * as vscode from "vscode";

import { IDebugProvider } from "./IDebugProvider";

export class JavaDebugProvider extends IDebugProvider {
  name: string = "Java";
  requireExtensions: string[] = ["vscjava.vscode-java-debug", "redhat.java"];

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
}
