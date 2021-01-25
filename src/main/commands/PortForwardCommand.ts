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
      const resArr = await kubectl.getControllerPod(
        node.getKubeConfigPath(),
        kind,
        name
      );
      if (resArr && resArr.length <= 0) {
        host.showErrorMessage("Not found pod");
        return;
      }
      const podNameArr = (resArr as Array<Resource>).map((res) => {
        return res.metadata.name;
      });
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
    if (node instanceof Deployment) {
      // new Port Forward
      const ports = portMap.split(",").filter((str) => {
        let reg = /[0-9]+:[0-9]+/g;
        if (reg.exec(str)) {
          return true;
        }
        return false;
      });
      if (ports.length < 0) {
        host.showInformationMessage("Please input correct content!");
        return;
      }
      await nhctl.startPortForward(
        host,
        node.getKubeConfigPath(),
        node.getAppName(),
        node.name,
        "manual",
        ports,
        podName
      );
      // refresh status
      node.setStatus("");
      host.showInformationMessage("Started Port Forward");
    } else {
      const terminalCommands = ["port-forward", podName, portMap];
      terminalCommands.push("--kubeconfig", node.getKubeConfigPath());
      const shellPath = "kubectl";
      const terminalDisposed = host.invokeInNewTerminalSpecialShell(
        terminalCommands,
        process.platform === "win32" ? `${shellPath}.exe` : shellPath,
        "kubectl"
      );
      terminalDisposed.show();
    }
    host.getOutputChannel().show(true);
  }
}
