import * as vscode from "vscode";
import * as path from "path";

import ICommand from "./ICommand";
import { EXEC } from "./constants";
import registerCommand from "./register";
import host, { Host } from "../host";
import { ControllerNodeApi } from "./StartDevModeCommand";
import * as shell from "../ctl/shell";
import { getPodNames, NhctlCommand, getContainerNames } from "../ctl/nhctl";
import { DeploymentStatus } from "../nodes/types/nodeType";
import { Pod } from "../nodes/workloads/pod/Pod";
import { NH_BIN } from "../constants";

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
    await host.showProgressing("opening ...", async () => {
      await this.exec(node);
    });
  }

  async exec(node: ControllerNodeApi | Pod) {
    const result = await this.getPodAndContainer(node);
    if (!result || !result.containerName || !result.podName) {
      return;
    }
    if (!(node instanceof Pod)) {
      const status = await node.getStatus(true);
      let container = result.containerName;
      let pod = result.podName;
      if (status === DeploymentStatus.developing) {
        container = "nocalhost-dev";
        pod = "";
      }
      const terminal = await shell.opendevSpaceExec(
        node.getAppName(),
        node.name,
        node.resourceType,
        container,
        node.getKubeConfigPath(),
        node.getNameSpace(),
        pod
      );
      host.pushDispose(
        node.getSpaceName(),
        node.getAppName(),
        node.name,
        terminal
      );
      return;
    }
    const terminal = await this.openExec(
      node,
      result.podName,
      result.containerName
    );
    host.pushDispose(
      node.getSpaceName(),
      node.getAppName(),
      node.name,
      terminal
    );
  }

  private async getDefaultShell(
    podName: string,
    constainerName: string,
    kubeConfigPath: string
  ) {
    let defaultShell = "sh";
    for (let i = 0; i < ExecCommand.defaultShells.length; i++) {
      let notExist = false;
      const shellObj = await shell
        .execAsyncWithReturn(
          NhctlCommand.exec({
            kubeConfigPath: kubeConfigPath,
          })
            .addArgument(podName)
            .addArgument("-c", constainerName)
            .addArgumentTheTail(`-- which ${ExecCommand.defaultShells[i]}`)
            .getCommand(),
          []
        )
        .catch(() => {
          notExist = true;
        });
      if (notExist) {
        continue;
      } else {
        const result = shellObj as shell.ShellResult;
        if (result.code === 0 && result.stdout) {
          defaultShell = ExecCommand.defaultShells[i];
          break;
        }
      }
    }

    return defaultShell;
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
    // const terminalCommands = new Array<string>();
    // terminalCommands.push("exec");
    // terminalCommands.push("-it", podName);
    // terminalCommands.push("-c", containerName);
    // terminalCommands.push("--kubeconfig", kubeConfigPath);
    // terminalCommands.push("--", shell);
    // const shellPath = "kubectl";
    const args = NhctlCommand.exec({
      kubeConfigPath: kubeConfigPath,
    })
      .addArgument("-it", podName)
      .addArgument("-c", containerName)
      .addArgumentTheTail(`-- ${shell}`).args;
    const terminalDisposed = host.invokeInNewTerminalSpecialShell(
      args,
      NhctlCommand.nhctlPath,
      podName
    );
    terminalDisposed.show();
    return terminalDisposed;
  }

  /**
   * exec
   * @param host
   * @param type
   * @param workloadName
   */
  async openExec(
    node: ControllerNodeApi | Pod,
    podName: string,
    container: string
  ) {
    return await this.execCore(node.getKubeConfigPath(), podName, container);
  }

  async getPodAndContainer(node: ControllerNodeApi | Pod) {
    const kubeConfigPath = node.getKubeConfigPath();
    let podName: string | undefined;
    let status = "";
    if (node instanceof Pod) {
      podName = node.name;
    } else {
      const podNameArr = await getPodNames({
        name: node.name,
        kind: node.resourceType,
        namespace: node.getNameSpace(),
        kubeConfigPath: kubeConfigPath,
      });
      podName = podNameArr[0];
      status = await node.getStatus(true);
      if (status !== DeploymentStatus.developing && podNameArr.length > 1) {
        podName = await vscode.window.showQuickPick(podNameArr);
      }
    }
    if (!podName) {
      return;
    }
    const containerNameArr = await getContainerNames({
      podName,
      kubeConfigPath: kubeConfigPath,
      namespace: node.getNameSpace(),
    });
    let containerName: string | undefined = containerNameArr[0];
    if (status !== DeploymentStatus.developing && containerNameArr.length > 1) {
      containerName = await vscode.window.showQuickPick(containerNameArr);
    }
    if (!containerName) {
      return;
    }

    return { containerName, podName };
  }
}
