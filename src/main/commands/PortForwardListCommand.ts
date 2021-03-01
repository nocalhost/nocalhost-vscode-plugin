import * as vscode from "vscode";

import ICommand from "./ICommand";
import { PORT_FORWARD_LIST } from "./constants";
import registerCommand from "./register";
import host from "../host";
import * as nhctl from "../ctl/nhctl";
import { KubernetesResourceNode } from "../nodes/abstract/KubernetesResourceNode";

export default class PortForwardListCommand implements ICommand {
  command: string = PORT_FORWARD_LIST;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: KubernetesResourceNode) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }

    const svcProfile = await nhctl.getServiceConfig(
      node.getAppName(),
      node.name
    );

    if (!svcProfile) {
      host.showErrorMessage("not get service config");
      return;
    }

    if (svcProfile.devPortForwardList.length < 1) {
      host.showInformationMessage("No Port Forward");
      return;
    }

    const portList = svcProfile.devPortForwardList.map((item) => {
      return `${item.localport}:${item.remoteport}`;
    });

    const endPort = await vscode.window.showQuickPick(portList);

    if (!endPort) {
      return;
    }

    const confirm = await host.showInformationMessage(
      `Do you want to stop port-forward ${endPort}?`,
      { modal: true },
      "Confirm"
    );

    if (confirm !== "Confirm") {
      return;
    }

    const assoPortForwardsMap = new Map<number, Array<string>>();
    let pid = 0;
    svcProfile.devPortForwardList.forEach((item) => {
      pid = item.pid;
      const result = assoPortForwardsMap.get(pid) || [];
      assoPortForwardsMap.set(
        pid,
        result.concat(`${item.localport}:${item.remoteport}`)
      );
    });

    const assoPortForwards = assoPortForwardsMap.get(pid);
    if (assoPortForwards && assoPortForwards.length > 1) {
      const confirm = await host.showInformationMessage(
        `
      The associated port (${assoPortForwards.join(
        ","
      )}) will also be terminated. Are you sure terminate?`,
        { modal: true },
        "Confirm"
      );
      if (confirm !== "Confirm") {
        return;
      }
    }
    await nhctl.endPortForward(
      node.getAppName(),
      node.name,
      endPort,
      node.resourceType
    );
    await vscode.commands.executeCommand("Nocalhost.refresh", node);
    host.showInformationMessage(`Ended Port Forward ${endPort}`);
    host.getOutputChannel().show(true);
  }
}
