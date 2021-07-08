import * as vscode from "vscode";
import * as path from "path";
import { spawnSync } from "child_process";
import { NhctlCommand } from "./../ctl/nhctl";
import { IDebugProvider } from "./IDebugprovider";
import host from "../host";

const defaultGoDebuggerExtensionId = "golang.go";

const defaultGoDebuggerExtension = "golang";

export class GoDebugProvider extends IDebugProvider {
  async startDebug(
    workspaceFolder: string,
    sessionName: string,
    port: number,
    workDir: string,
    terminatedCallback: () => any
  ): Promise<boolean> {
    // check extension installed
    const debugConfiguration: vscode.DebugConfiguration = {
      name: sessionName,
      type: "go",
      request: "attach",
      mode: "remote",
      // remotePath: workDir || "/home/nocalhost-dev/",
      remotePath: "${workspaceFolder}",
      port,
      host: "localhost",
      // trace: "verbose", // check debug step
      // NOT SUPPORT CWD, will occur error
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

  public async isDebuggerInstalled(): Promise<boolean> {
    if (vscode.extensions.getExtension(defaultGoDebuggerExtensionId)) {
      return true;
    }
    const answer = await vscode.window.showInformationMessage(
      `go debugging requires the '${defaultGoDebuggerExtension}' extension. Would you like to install it now?`,
      "Install Now"
    );
    if (answer === "Install Now") {
      return await host.installVscodeExtension(defaultGoDebuggerExtensionId);
    }
    return false;
  }

  public killContainerDebugProcess(
    podName: string,
    kubeconfigPath: string,
    execCommand: string[],
    namespace: string
  ) {
    super.killContainerDebugProcess(
      podName,
      kubeconfigPath,
      execCommand,
      namespace
    );
    // kill exec program
    const index = execCommand.indexOf("exec");
    if (index < 0) {
      return;
    }
    const searchCommand = execCommand[index + 1];
    host.log("searchCommand: " + searchCommand, true);
    const command = `k exec ${podName} -c nocalhost-dev --kubeconfig ${kubeconfigPath} --`;
    const args = command.split(" ");

    const killCommand = `kill -9 \`ps aux|grep -i '${searchCommand.trim()}'|grep -v grep|awk '{print $2}'\``;

    args.push("bash", "-c", `${killCommand}`);
    spawnSync(NhctlCommand.nhctlPath, args);
  }
}
