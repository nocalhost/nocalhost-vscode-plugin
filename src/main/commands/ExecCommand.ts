import * as vscode from "vscode";

import ICommand from "./ICommand";
import { EXEC } from "./constants";
import registerCommand from "./register";
import host, { Host } from "../host";
import { ControllerNodeApi } from "./StartDevModeCommand";
import * as kubectl from "../ctl/kubectl";
import * as shell from "../ctl/shell";
import { DeploymentStatus } from "../nodes/types/nodeType";
import { Pod } from "../nodes/workloads/pod/Pod";

export default class ExecCommand implements ICommand {
  command: string = EXEC;
  static defaultShells = ["zsh", "bash"];
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: ControllerNodeApi) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    await this.exec(node);
  }

  async exec(node: ControllerNodeApi | Pod) {
    if (!(node instanceof Pod)) {
      const status = await node.getStatus();
      if (status === DeploymentStatus.developing) {
        await this.opendevSpaceExec(
          node.getAppName(),
          node.name,
          node.getKubeConfigPath()
        );
        return;
      }
    }
    this.openExec(node);
  }

  private async getDefaultShell(
    podName: string,
    constainerName: string,
    kubeConfigPath: string
  ) {
    let defaultShell = "sh";
    for (let i = 0; i < ExecCommand.defaultShells.length; i++) {
      const shellObj = await shell.execAsync(
        `kubectl exec ${podName} -c ${constainerName} --kubeconfig ${kubeConfigPath} -- which ${ExecCommand.defaultShells[i]}`,
        []
      );
      if (shellObj.code === 0 && shellObj.stdout) {
        defaultShell = ExecCommand.defaultShells[i];
        break;
      }
    }

    return defaultShell;
  }

  async opendevSpaceExec(
    appName: string,
    workloadName: string,
    kubeConfigPath: string
  ) {
    host.log("Opening DevSpace terminal", true);
    host.showInformationMessage("Opening DevSpace terminal");

    const terminalCommands = ["dev", "terminal", appName];
    terminalCommands.push("-d", workloadName);
    terminalCommands.push("--kubeconfig", kubeConfigPath);
    const shellPath = "nhctl";
    const terminalDisposed = host.invokeInNewTerminalSpecialShell(
      terminalCommands,
      process.platform === "win32" ? `${shellPath}.exe` : shellPath,
      workloadName
    );
    terminalDisposed.show();
    host.pushDebugDispose(terminalDisposed);
    host.showInformationMessage("DevSpace terminal Opened");
    host.log("", true);
  }

  private async execCore(
    kubeConfigPath: string,
    podName: string,
    containerName: string
  ) {
    let shell = await this.getDefaultShell(
      podName,
      containerName,
      kubeConfigPath
    );
    const terminalCommands = new Array<string>();
    terminalCommands.push("exec");
    terminalCommands.push("-it", podName);
    terminalCommands.push("-c", containerName);
    terminalCommands.push("--kubeconfig", kubeConfigPath);
    terminalCommands.push("--", shell);
    const shellPath = "kubectl";
    const terminalDisposed = host.invokeInNewTerminalSpecialShell(
      terminalCommands,
      process.platform === "win32" ? `${shellPath}.exe` : shellPath,
      podName
    );
    terminalDisposed.show();
    host.pushDebugDispose(terminalDisposed);
  }

  /**
   * exec
   * @param host
   * @param type
   * @param workloadName
   */
  async openExec(node: ControllerNodeApi | Pod) {
    const kubeConfigPath = node.getKubeConfigPath();
    let podName: string | undefined;
    if (node instanceof Pod) {
      podName = node.name;
    } else {
      const podNameArr = await kubectl.getPodNames(
        node.name,
        node.resourceType,
        kubeConfigPath
      );
      podName = podNameArr[0];
      if (podNameArr.length > 1) {
        podName = await vscode.window.showQuickPick(podNameArr);
      }
    }
    if (!podName) {
      return;
    }
    const containerNameArr = await kubectl.getContainerNames(
      podName,
      kubeConfigPath
    );
    let containerName: string | undefined = containerNameArr[0];
    if (containerNameArr.length > 1) {
      containerName = await vscode.window.showQuickPick(containerNameArr);
    }
    if (!containerName) {
      return;
    }
    await this.execCore(kubeConfigPath, podName, containerName);
  }
}
