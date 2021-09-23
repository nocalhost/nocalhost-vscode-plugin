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
      mode: "remote",
      pathMappings: [
        {
          localRoot: "${workspaceFolder}", // Maps C:\Users\user1\project1
          remoteRoot: workDir || "/home/nocalhost-dev/", // To current working directory ~/project1
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
