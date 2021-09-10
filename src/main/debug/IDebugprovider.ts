import { spawnSync } from "child_process";
import * as vscode from "vscode";
import * as path from "path";

import host from "../host";
import logger from "../utils/logger";
import { NhctlCommand } from "./../ctl/nhctl";

export abstract class IDebugProvider {
  abstract startDebug(
    workspaceFolder: string,
    sessionName: string,
    port: number,
    workDir: string,
    terminatedCallback?: Function
  ): Promise<boolean>;

  startDebugging(
    workspaceFolder: string,
    config: vscode.DebugConfiguration,
    terminatedCallback?: Function
  ): Thenable<boolean> {
    const { name } = config;

    const currentFolder = (vscode.workspace.workspaceFolders || []).find(
      (folder) => folder.name === path.basename(workspaceFolder)
    );

    const disposables: vscode.Disposable[] = [
      vscode.debug.onDidStartDebugSession((debugSession) => {
        if (debugSession.name === name) {
          host.log(
            "The debug session has started. Your application is ready for you to debug.",
            true
          );
        }
      }),
      vscode.debug.onDidTerminateDebugSession(async (debugSession) => {
        if (debugSession.name === name) {
          disposables.forEach((d) => d.dispose());
          terminatedCallback && terminatedCallback();

          host.log("Terminated debug session", true);
        }
      }),
    ];

    return vscode.debug.startDebugging(currentFolder, config);
  }
  public killContainerDebugProcess(
    podName: string,
    kubeconfigPath: string,
    execCommand: string[],
    namespace: string
  ) {
    const command = `k exec ${podName} -c nocalhost-dev --kubeconfig ${kubeconfigPath} -n ${namespace} --`;
    const args = command.split(" ");
    const sliceCommands = execCommand.join(" ");

    const killCommand = `kill -9 \`ps aux|grep -i '${sliceCommands}'|grep -v grep|awk '{print $2}'\``;

    args.push("bash", "-c", `${killCommand}`);

    const cmd = `${NhctlCommand.nhctlPath} ${args.join(" ")}`;
    host.log(`[debug] ${cmd}`, true);
    logger.error(`[cmd]: ${cmd}`);

    spawnSync(NhctlCommand.nhctlPath, args);
  }

  public async isDebuggerInstalled() {
    return Promise.resolve(true);
  }

  /**
   * install
   */
  public async installExtension(
    extensionName: string,
    extensionArry: string[]
  ) {
    let answer = await vscode.window.showInformationMessage(
      `Go debugging requires the '${extensionName}' extension. Would you like to install it now?`,
      "Install Now"
    );

    if (!answer) {
      return;
    }

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification },
      async (p) => {
        p.report({ message: `Installing ${extensionName} ...` });

        for (const id of extensionArry) {
          await vscode.commands.executeCommand(
            "workbench.extensions.installExtension",
            id
          );
        }
      }
    );

    const RELOAD = "Reload Window";
    const choice = await vscode.window.showInformationMessage(
      "Please reload window to activate Language Support for Java.",
      RELOAD
    );
    if (choice === RELOAD) {
      await vscode.commands.executeCommand("workbench.action.reloadWindow");
    }

    return false;
  }

  async checkRequiredCommand(
    podName: string,
    namespace: string,
    kubeconfigPath: string
  ) {
    host.log("[debug] check required command", true);

    function check(requiredCommand: string) {
      const command = `k exec ${podName} -c nocalhost-dev --kubeconfig ${kubeconfigPath} -n ${namespace}  --`;
      const args = command.split(" ");

      args.push(`which ${requiredCommand}`);
      host.log(`[cmd]：${NhctlCommand.nhctlPath} ${args.join(" ")}`, true);

      const result = spawnSync(NhctlCommand.nhctlPath, args);

      return result.stdout;
    }
    const notFound: Array<string> = [];
    ["ps", "awk", "netstat"].forEach((c) => {
      const r = check(c);
      if (!r) {
        notFound.push(c);
      }
    });

    if (notFound.length > 0) {
      const msg = "Not found command in container: " + notFound.join(" ");
      throw new Error(msg);
    }
  }
}
