import * as vscode from "vscode";

import ICommand from "./ICommand";
import { PORT_FORWARD } from "./constants";
import registerCommand from "./register";
import { KubernetesResourceNode } from "../nodes/nodeType";
import host from "../host";
import { CURRENT_KUBECONFIG_FULLPATH } from "../constants";
import { Resource } from "../nodes/resourceType";
import * as kubectl from "../ctl/kubectl";
import * as fileStore from "../store/fileStore";

export default class PortForwardCommand implements ICommand {
  command: string = PORT_FORWARD;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: KubernetesResourceNode) {
    const kind = node.resourceType;
    const name = node.name;
    const resArr = await kubectl.getControllerPod(host, kind, name);
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
    // kubeconfig
    const kubeconfigPath = fileStore.get(CURRENT_KUBECONFIG_FULLPATH);
    const command = `kubectl port-forward ${podName} ${portMap} --kubeconfig ${kubeconfigPath}`;
    const terminalDisposed = host.invokeInNewTerminal(command);
    host.pushDebugDispose(terminalDisposed);
    host.log("open container end", true);
    host.log("", true);
  }
}
