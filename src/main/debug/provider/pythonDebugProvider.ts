import { DebugConfiguration } from "vscode";
import { IDebugProvider } from "./";

export class PythonDebugProvider implements IDebugProvider {
  name: string;
  requireExtensions: string[];
  constructor() {
    this.name = "Python";
    this.requireExtensions = ["ms-python.python"];
  }
  async getDebugConfiguration(
    name: string,
    port: number,
    remoteRoot: string
  ): Promise<DebugConfiguration> {
    return {
      name,
      type: "python",
      request: "attach",
      pathMappings: [
        {
          localRoot: "${workspaceFolder}",
          remoteRoot,
        },
      ],
      connect: {
        port,
        host: "127.0.0.1",
      },
    };
  }
}
