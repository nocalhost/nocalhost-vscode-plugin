import * as vscode from "vscode";

import ICommand from "./ICommand";
import { EXEC } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { ControllerNodeApi } from "./StartDevModeCommand";
import * as shell from "../ctl/shell";
import { getPodNames, NhctlCommand, getContainers } from "../ctl/nhctl";
import { DeploymentStatus } from "../nodes/types/nodeType";
import { Pod } from "../nodes/workloads/pod/Pod";
import { ExecOutputReturnValue } from "shelljs";

export default class ExecCommand implements ICommand {
  command: string = EXEC;
  static defaultShells = ["zsh", "bash"];
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: ControllerNodeApi) {
    if (!node) {
      host.showWarnMessage(
        "This service is already in DevMode and you not the initiator, do you want exit the DevMode first?"
      );
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
    const status = await node.getStatus(true);

    if (status === DeploymentStatus.developing || !(node instanceof Pod)) {
      let container = result.containerName;
      let pod = result.podName;
      if (status === DeploymentStatus.developing) {
        container = "nocalhost-dev";
        pod = "";
      }
      const terminal = await shell.openDevSpaceExec(
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

      const command = NhctlCommand.exec({
        kubeConfigPath,
      })
        .addArgument(podName)
        .addArgument("-c", constainerName)
        .addArgumentTheTail(`-- which ${ExecCommand.defaultShells[i]}`)
        .getCommand();

      const shellObj = await shell.exec({ command }).promise.catch(() => {
        notExist = true;
      });

      if (notExist) {
        continue;
      } else {
        const result = shellObj as ExecOutputReturnValue;
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

    status = await node.getStatus(true);
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
      if (status !== DeploymentStatus.developing && podNameArr.length > 1) {
        podName = await vscode.window.showQuickPick(podNameArr);
      }
    }
    if (!podName) {
      return;
    }

    let containerName: string | undefined;
    if (status === DeploymentStatus.developing) {
      containerName = "nocalhost-dev";
    } else {
      const containerNameArr = await getContainers({
        appName: node.getAppName(),
        name: node.name,
        resourceType: node.resourceType,
        kubeConfigPath: node.getKubeConfigPath(),
        namespace: node.getNameSpace(),
      });
      containerName = containerNameArr[0];
      if (
        status !== DeploymentStatus.developing &&
        containerNameArr.length > 1
      ) {
        containerName = await vscode.window.showQuickPick(containerNameArr);
      }
    }

    if (!containerName) {
      return;
    }

    return { containerName, podName };
  }
}
