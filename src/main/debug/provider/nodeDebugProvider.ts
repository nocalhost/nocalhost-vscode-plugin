import { IDebugProvider } from "./iDebugProvider";

export class NodeDebugProvider extends IDebugProvider {
  name: "node";
  requireExtensions: [];

  async startDebug(
    workspaceFolder: string,
    sessionName: string,
    port: number,
    workDir: string,
    terminatedCallback?: Function
  ): Promise<boolean> {
    //https://github.dev/microsoft/vscode-js-debug/blob/a570239f82641de25583ccdaadf9c0903c1a6a78/src/targets/node/restartPolicy.ts

    const debugConfiguration = {
      type: "node",
      request: "attach",
      name: sessionName,
      hostName: "localhost",
      skipFiles: ["<node_internals>/**/*.js"],
      port,
      sourceMaps: true,
      localRoot: "${workspaceRoot}",
      remoteRoot: workDir || "/home/nocalhost-dev/",
      //nodemon
      // restart: {
      //   delay: 500,
      //   maxAttempts: 10,
      // },
    };

    return super.startDebugging(
      workspaceFolder,
      debugConfiguration,
      terminatedCallback
    );
  }
}
