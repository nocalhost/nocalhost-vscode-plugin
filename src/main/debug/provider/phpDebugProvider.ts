import * as vscode from "vscode";

import { IDebugProvider } from "./IDebugProvider";
export class PhpDebugProvider extends IDebugProvider {
  name: string = "Php";
  requireExtensions: string[] = ["felixfbecker.php-debug"];

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
