import * as vscode from "vscode";

import ICommand from "./ICommand";
import { PORT_FORWARD } from "./constants";
import registerCommand from "./register";
import host from "../host";
import * as kubectl from "../ctl/kubectl";
import { KubernetesResourceNode } from "../nodes/abstract/KubernetesResourceNode";
import { Resource } from "../nodes/types/resourceType";

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
    const kind = node.resourceType;
    const name = node.name;
    const appNode = node.getAppNode();
    const resArr = await kubectl.getControllerPod(
      appNode.getKUbeconfigPath(),
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
    let podName: string | undefined = podNameArr[0];
    if (podNameArr.length > 1) {
      podName = await vscode.window.showQuickPick(podNameArr);
    }
    if (!podName) {
      return;
    }
    let portMap: string | undefined = "";
    portMap = await vscode.window.showInputBox({
      placeHolder: "eg: 1234:1234",
    });
    if (!portMap) {
      return;
    }
    const terminalCommands = ["port-forward", podName, portMap];
    terminalCommands.push("--kubeconfig", node.getKubeConfigPath());
    const shellPath = "kubectl";
    const terminalDisposed = host.invokeInNewTerminalSpecialShell(
      terminalCommands,
      process.platform === "win32" ? `${shellPath}.exe` : shellPath,
      "kubectl"
    );
    terminalDisposed.show();
    host.pushDebugDispose(terminalDisposed);
    host.log("open container end", true);
    host.log("", true);
  }
}
