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

    const portforwardData = await nhctl.listPortForward(
      node.getAppName(),
      node.name
    );

    if (portforwardData.portForwardStatusList.length < 1) {
      host.showInformationMessage("No Port Forward");
      return;
    }

    const endPort = await vscode.window.showQuickPick(
      portforwardData.portForwardStatusList
    );

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

    let reg = /([0-9]+:[0-9]+)/g;

    const match = reg.exec(endPort);

    if (!match) {
      return;
    }

    const assoPortForwardsMap = new Map<string, Array<string>>();
    let pid = "";
    portforwardData.portForwardPidList.forEach((str) => {
      const portPid = str.split("-");
      if (portPid[0] === match[1]) {
        pid = portPid[1];
      }
      const result = assoPortForwardsMap.get(portPid[1]) || [];
      assoPortForwardsMap.set(portPid[1], result.concat([portPid[0]]));
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
    if (match && match[1]) {
      await nhctl.endPortForward(node.getAppName(), node.name, match[1]);
      host.showInformationMessage(`Ended Port Forward ${match[1]}`);
    }
    host.getOutputChannel().show(true);
  }
}
