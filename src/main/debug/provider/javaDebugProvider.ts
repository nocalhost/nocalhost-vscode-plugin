import * as vscode from "vscode";

import { IDebugProvider } from "./";

export class JavaDebugProvider implements IDebugProvider {
  name: string;
  requireExtensions: string[];
  constructor() {
    this.name = "Java";
    this.requireExtensions = ["vscjava.vscode-java-debug", "redhat.java"];
  }

  async getDebugConfiguration(
    name: string,
    port: number,
    remotePath: string
  ): Promise<vscode.DebugConfiguration> {
    return {
      type: "java",
      name,
      request: "attach",
      hostName: "localhost",
      port,
    };
  }
}
