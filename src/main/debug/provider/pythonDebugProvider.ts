import { IDebugProvider } from "./iDebugProvider";

export class PythonDebugProvider extends IDebugProvider {
  name = "python";
  requireExtensions = ["ms-python.python"];

  async startDebug(
    workspaceFolder: string,
    sessionName: string,
    port: number,
    workDir: string,
    terminatedCallback: Function
  ): Promise<boolean> {
    const debugConfiguration = {
      name: sessionName,
      type: "go",
      request: "attach",
      mode: "remote",
      remotePath: workDir || "/home/nocalhost-dev/",
      localRoot: "${workspaceRoot}",
      port,
      host: "localhost",
      // trace: "verbose", // check debug step
      // NOT SUPPORT CWD, will occur error
    };

    return super.startDebugging(
      workspaceFolder,
      debugConfiguration,
      terminatedCallback
    );
  }
}
