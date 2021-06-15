import * as vscode from "vscode";
import * as path from "path";
import { IDebugProvider } from "./IDebugprovider";
import host from "../host";
import { NhctlCommand } from "./../ctl/nhctl";
import { spawnSync } from "child_process";

const defaultJavaDebuggerExtensionId = "vscjava.vscode-java-debug";
const defaultJavaDebuggerExtension = "Debugger for Java";

export class JavaDebugProvider extends IDebugProvider {
  async startDebug(
    workspaceFolder: string,
    sessionName: string,
    port: number,
    workDir: string,
    terminatedCallback: () => any
  ): Promise<boolean> {
    const debugConfiguration: vscode.DebugConfiguration = {
      type: "java",
      name: sessionName,
      projectName: sessionName,
      request: "attach",
      hostName: "localhost",
      port,
    };
    const currentFolder = (vscode.workspace.workspaceFolders || []).find(
      (folder) => folder.name === path.basename(workspaceFolder)
    );
    const disposables: vscode.Disposable[] = [];
    disposables.push(
      vscode.debug.onDidStartDebugSession((debugSession) => {
        if (debugSession.name === sessionName) {
          host.log(
            "The debug session has started. Your application is ready for you to debug.",
            true
          );
        }
      })
    );

    disposables.push(
      vscode.debug.onDidTerminateDebugSession(async (debugSession) => {
        if (debugSession.name === sessionName) {
          disposables.forEach((d) => d.dispose());
          await terminatedCallback();
          host.log("Terminated debug session", true);
        }
      })
    );
    return await vscode.debug.startDebugging(currentFolder, debugConfiguration);
  }

  public killContainerDebugProcess(
    podName: string,
    kubeconfigPath: string,
    execCommand: string[]
  ) {
    super.killContainerDebugProcess(podName, kubeconfigPath, execCommand);
    // kill exec program
    const searchCommand = "java";
    host.log("searchCommand: " + searchCommand, true);
    const command = `k exec ${podName} -c nocalhost-dev --kubeconfig ${kubeconfigPath} --`;
    const args = command.split(" ");

    const killCommand = `kill -9 \`ps aux|grep -i '${searchCommand.trim()}'|grep -v grep|awk '{print $2}'\``;
    args.push("bash", "-c", `${killCommand}`);
    spawnSync(NhctlCommand.nhctlPath, args);
  }

  public async isDebuggerInstalled(): Promise<boolean> {
    if (vscode.extensions.getExtension(defaultJavaDebuggerExtensionId)) {
      return true;
    }
    const answer = await vscode.window.showInformationMessage(
      `go debugging requires the '${defaultJavaDebuggerExtension}' extension. Would you like to install it now?`,
      "Install Now"
    );
    if (answer === "Install Now") {
      return await host.installVscodeExtension(defaultJavaDebuggerExtensionId);
    }
    return false;
  }
}
