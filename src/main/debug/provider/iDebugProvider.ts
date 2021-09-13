import { spawnSync } from "child_process";
import * as vscode from "vscode";
import * as path from "path";
const isPortReachable = require("is-port-reachable");
const retry = require("async-retry");

import host from "../../host";
import logger from "../../utils/logger";
import { NhctlCommand } from "../../ctl/nhctl";

export abstract class IDebugProvider {
  name: string = null;
  requireExtensions: Array<string> = [];

  abstract startDebug(
    workspaceFolder: string,
    sessionName: string,
    port: number,
    workDir: string,
    terminatedCallback?: Function
  ): Promise<boolean>;

  async startDebugging(
    workspaceFolder: string,
    config: vscode.DebugConfiguration & { port: number },
    terminatedCallback?: Function
  ): Promise<boolean> {
    const { name, port, hostName } = config;

    await retry(
      () =>
        isPortReachable(port, {
          host: hostName,
          timeout: 1 * 1000,
        }),
      { maxRetryTime: 30 * 1000 }
    );

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

    const killCommand = `ps aux|grep -i '${sliceCommands}'|grep -v grep|awk '{print $2}'|xargs kill -9`;

    args.push("sh", "-c", `${killCommand}`);

    const cmd = `${NhctlCommand.nhctlPath} ${args.join(" ")}`;
    host.log(`[debug] ${cmd}`, true);
    logger.error(`[cmd]: ${cmd}`);

    spawnSync(NhctlCommand.nhctlPath, args);
  }

  public async isDebuggerInstalled() {
    if (
      this.requireExtensions.length > 0 &&
      !this.existExtensions(this.requireExtensions)
    ) {
      return await this.installExtension(this.requireExtensions);
    }

    return Promise.resolve(true);
  }

  private existExtensions(extensionArray: string[]) {
    return extensionArray.every(vscode.extensions.getExtension);
  }
  /**
   * install
   */
  private async installExtension(extensionArray: string[]) {
    let answer = await vscode.window.showInformationMessage(
      `Debugger for ${this.name} requires extension. Would you like to install it now?`,
      "Install Now"
    );

    if (!answer) {
      return;
    }

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification },
      async (p) => {
        p.report({ message: `Installing debugger for ${this.name} ...` });

        for (const id of extensionArray) {
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
