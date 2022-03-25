import * as vscode from "vscode";

import host from "../../host";
import { KubernetesResourceNode } from "../../nodes/abstract/KubernetesResourceNode";
import { AppNode } from "../../nodes/AppNode";
import { PORT_FORWARD } from "../constants";
import ICommand from "../ICommand";
import registerCommand from "../register";
import { addPortForward } from "./addPortForward";
import { getAppPortForwardList, getPortForwardList } from "./portForwardList";
import * as nhctl from "../../ctl/nhctl";

export default class PortForwardCommand implements ICommand {
  command: string = PORT_FORWARD;
  node: KubernetesResourceNode;

  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: KubernetesResourceNode) {
    if (!node) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }
    this.node = node;

    if (node instanceof AppNode) {
      this.stopPortForward(await getAppPortForwardList(node));
    } else {
      this.showQuickPick(node);
    }
  }
  async showQuickPick(node: KubernetesResourceNode) {
    const pick = vscode.window.createQuickPick();
    pick.placeholder = "Find port forward";
    pick.items = [
      { label: "$(add) Add port forward", alwaysShow: true },
      ...(await getPortForwardList(node)),
    ];

    pick.onDidHide(() => {
      pick.dispose();
    });

    pick.onDidChangeSelection(async (e) => {
      const item = e[0];

      if (item.label === "$(add) Add port forward") {
        addPortForward(node);
      } else {
        this.stopPortForward(item);
      }
      pick.hide();
    });

    pick.show();
  }

  async stopPortForward(item: vscode.QuickPickItem | nhctl.IPortForward) {
    if (!item) {
      return;
    }

    let port: string;

    let { namespace, appName, name, resourceType } = this.node;

    if ("label" in item) {
      port = item.label;
    } else {
      port = item.port;
      appName = name;
      name = item.svcName;
      resourceType = item.servicetype;
    }

    const confirm = await host.showInformationMessage(
      `Do you want to stop port-forward ${port}?`,
      { modal: true },
      "Confirm"
    );

    if (confirm !== "Confirm") {
      return;
    }

    await nhctl.endPortForward({
      namespace,
      kubeConfigPath: this.node.getKubeConfigPath(),
      appName,
      workloadName: name,
      port,
      resourceType,
    });

    await vscode.commands.executeCommand("Nocalhost.refresh", this.node.parent);

    host.showInformationMessage(`Ended Port Forward ${port}`);

    host.getOutputChannel().show(true);
  }
}
