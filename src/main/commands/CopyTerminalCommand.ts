import * as vscode from "vscode";

import ICommand from "./ICommand";
import { COPY_TERMINAL } from "./constants";
import registerCommand from "./register";
import host, { Host } from "../host";
import { ControllerNodeApi } from "./StartDevModeCommand";
import * as kubectl from "../ctl/kubectl";
import * as shell from "../ctl/shell";
import { DeploymentStatus } from "../nodes/types/nodeType";
import { Pod } from "../nodes/workloads/pod/Pod";

export default class CopyTerminalCommand implements ICommand {
  command: string = COPY_TERMINAL;
  static defaultShells = ["zsh", "bash"];
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: ControllerNodeApi) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    await host.showProgressing("copying ...", async () => {
      await this.exec(node);
    });
  }

  async exec(node: ControllerNodeApi | Pod) {
    if (!(node instanceof Pod)) {
      const status = await node.getStatus();
      let container = "";
      let pod = "";
      if (status === DeploymentStatus.developing) {
        container = "nocalhost-dev";
        pod = "";
      } else {
        const result = await this.getPodAndContainer(node);
        if (!result || !result.containerName || !result.podName) {
          return;
        }
        container = result.containerName;
        pod = result.podName;
      }
      await this.opendevSpaceExec(
        node.getAppName(),
        node.name,
        pod,
        container,
        node.getKubeConfigPath(),
        node.getNameSpace()
      );
      return;
    } else {
      await this.openExec(node);
    }
  }

  private async getDefaultShell(
    podName: string,
    constainerName: string,
    kubeConfigPath: string
  ) {
    let defaultShell = "sh";
    for (let i = 0; i < CopyTerminalCommand.defaultShells.length; i++) {
      let notExist = false;
      const shellObj = await shell
        .execAsyncWithReturn(
          `kubectl exec ${podName} -c ${constainerName} --kubeconfig ${kubeConfigPath} -- which ${CopyTerminalCommand.defaultShells[i]}`,
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
          defaultShell = CopyTerminalCommand.defaultShells[i];
          break;
        }
      }
    }

    return defaultShell;
  }

  async opendevSpaceExec(
    appName: string,
    workloadName: string,
    pod: string,
    container: string,
    kubeConfigPath: string,
    namespace: string
  ) {
    const terminalCommands = ["dev", "terminal", appName];
    terminalCommands.push("-d", workloadName);
    terminalCommands.push("--kubeconfig", kubeConfigPath);
    terminalCommands.push("-n", namespace);
    if (pod) {
      terminalCommands.push("--pod", pod);
    }
    if (container) {
      terminalCommands.push("-c", container);
    }
    const shellPath = "nhctl";
    host.copyTextToclipboard(`${shellPath} ${terminalCommands.join(" ")}`);
    host.showInformationMessage("Copyed Terminal");
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
    host.copyTextToclipboard(`${shellPath} ${terminalCommands.join(" ")}`);
    host.showInformationMessage("Copyed Terminal");
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

  async getPodAndContainer(node: ControllerNodeApi | Pod) {
    const kubeConfigPath = node.getKubeConfigPath();
    let podName: string | undefined;
    let status = "";
    if (node instanceof Pod) {
      podName = node.name;
    } else {
      const podNameArr = await kubectl.getPodNames(
        node.name,
        node.resourceType,
        kubeConfigPath
      );
      podName = podNameArr[0];
      status = await node.getStatus();
      if (status !== DeploymentStatus.developing && podNameArr.length > 1) {
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
    if (status !== DeploymentStatus.developing && containerNameArr.length > 1) {
      containerName = await vscode.window.showQuickPick(containerNameArr);
    }
    if (!containerName) {
      return;
    }

    return { containerName, podName };
  }
}
