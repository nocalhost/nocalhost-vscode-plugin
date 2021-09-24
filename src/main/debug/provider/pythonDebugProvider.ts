import { IDebugProvider } from "./iDebugProvider";

export class PythonDebugProvider extends IDebugProvider {
  name = "python";
  requireExtensions = ["ms-python.python"];

  async startDebug(
    workspaceFolder: string,
    sessionName: string,
    port: number,
    workDir: string
  ): Promise<boolean> {
    const debugConfiguration = {
      name: sessionName,
      type: "python",
      request: "attach",
      pathMappings: [
        {
          localRoot: "${workspaceFolder}",
          remoteRoot: workDir || "/home/nocalhost-dev/",
        },
      ],
      connect: {
        port,
        host: "127.0.0.1",
      },
    };

    return super.startDebugging(workspaceFolder, debugConfiguration);
  }
}
