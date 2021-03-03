import * as vscode from "vscode";

import ICommand from "./ICommand";
import { PORT_FORWARD } from "./constants";
import registerCommand from "./register";
import host from "../host";
import * as kubectl from "../ctl/kubectl";
import * as nhctl from "../ctl/nhctl";
import { KubernetesResourceNode } from "../nodes/abstract/KubernetesResourceNode";
import { Resource } from "../nodes/types/resourceType";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import { Pod } from "../nodes/workloads/pod/Pod";
import { Deployment } from "../nodes/workloads/controllerResources/deployment/Deployment";
import { StatefulSet } from "../nodes/workloads/controllerResources/statefulSet/StatefulSet";

export default class PortForwardCommand implements ICommand {
  command: string = PORT_FORWARD;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: KubernetesResourceNode) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    let podName: string | undefined;
    if (node instanceof ControllerResourceNode) {
      const kind = node.resourceType;
      const name = node.name;

      const podNameArr = await kubectl.getRunningPodNames(
        name,
        kind,
        node.getKubeConfigPath()
      );
      podName = podNameArr[0];
      if (podNameArr.length > 1) {
        podName = await vscode.window.showQuickPick(podNameArr);
      }
      if (!podName) {
        return;
      }
    } else if (node instanceof Pod) {
      podName = node.name;
    } else {
      host.showInformationMessage("Not support the kind!");
      return;
    }

    let placeHolder = "eg: 1234:1234";
    if (node instanceof Deployment) {
      placeHolder = "single: 1234:1234  multiple: 1234:1234,2345:2345";
    }

    let portMap: string | undefined = "";
    portMap = await vscode.window.showInputBox({
      placeHolder: placeHolder,
    });
    if (!portMap) {
      return;
    }
    if (node instanceof Deployment || node instanceof StatefulSet) {
      // new Port Forward
      const ports = portMap.split(",").filter((str) => {
        let reg = /([0-9]+)?:[0-9]+/g;
        if (reg.exec(str)) {
          return true;
        }
        return false;
      });
      if (ports.length <= 0) {
        host.showErrorMessage("Please input correct content!");
        return;
      }
      await nhctl.startPortForward(
        host,
        node.getKubeConfigPath(),
        node.getAppName(),
        node.name,
        "manual",
        node.resourceType,
        ports,
        podName
      );
      // refresh status
      node.setStatus("");
      host.showInformationMessage("Started Port Forward");
    } else {
      let terminalCommands = ["port-forward", podName, portMap];
      terminalCommands.push("--kubeconfig", node.getKubeConfigPath());
      let shellPath = "kubectl";

      let reg = /([0-9]+)|:([0-9]+)|([0-9]+):([0-9]+)/;
      const match = reg.exec(portMap);
      let sudo;
      if (match) {
        let localPort = match[3] || match[1];

        if (localPort && Number(localPort) < 1024) {
          sudo = this.getSudo();
        }
        console.log(match);
      } else {
        host.showErrorMessage("please input correct content");
        return;
      }
      if (sudo) {
        if (!host.isWindow()) {
          terminalCommands.unshift(shellPath);
          host.showInformationMessage("Please input your password");
        } else {
          // const username = await host.showInputBox({placeHolder: "Please input a super administrator account"});
          // if (!username) {
          //   return;
          // }
          // const command = `"${shellPath} ${terminalCommands.join(" ")}"`;
          // terminalCommands = [`/user:${username}`, command];
        }
      }
      const terminalDisposed = host.invokeInNewTerminalSpecialShell(
        terminalCommands,
        this.getShellPath(sudo, shellPath),
        "kubectl"
      );
      terminalDisposed.show();
    }
    host.getOutputChannel().show(true);
  }

  getSudo() {
    return host.isWindow() ? "kubectl.exe" : "sudo";
  }

  getShellPath(isSudo: string | undefined, shellPath: string) {
    if (isSudo) {
      return this.getSudo();
    }

    return host.isWindow() ? `${shellPath}.exe` : shellPath;
  }
}
