import { IPortForWard } from "./../domain/IPortForWard";
import * as vscode from "vscode";
import { AppNode } from "../nodes/AppNode";
import ICommand from "./ICommand";
import { PORT_FORWARD_LIST } from "./constants";
import registerCommand from "./register";
import host from "../host";
import * as nhctl from "../ctl/nhctl";
import { KubernetesResourceNode } from "../nodes/abstract/KubernetesResourceNode";

interface IEndPortInfo {
  kubeConfigPath: string;
  namespace: string;
  appName: string;
  workloadName: string;
  port: string;
  resourceType: string;
  selectContent: string;
  title: string;
}

function filter(item: { role?: string }) {
  if (item.role === "SYNC") {
    return false;
  }
  return true;
}

async function portForWardListByApp(node: AppNode): Promise<IEndPortInfo> {
  let portList: string[] = [];
  const portInfoMap: {
    [key: string]: IPortForWard;
  } = Object.create(null);
  const targetNode = node as AppNode;
  let portForwardList = await nhctl.getPortForWardByApp({
    kubeConfigPath: targetNode.getKubeConfigPath(),
    namespace: targetNode.namespace,
    appName: targetNode.name,
  });
  portForwardList = (portForwardList || []).filter(filter);
  if (!portForwardList || portForwardList.length === 0) {
    host.showErrorMessage("Can not get service config");
    return;
  }

  portList = portForwardList.map((item) => {
    const key = `${item.port} ${item.svcName || ""}${
      item.servicetype ? `(${item.servicetype})` : ""
    }`;
    portInfoMap[key] = item;
    return key;
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
  return {
    kubeConfigPath: node.getKubeConfigPath(),
    namespace: node.namespace,
    appName: node.name,
    workloadName: portInfoMap[endPort].svcName,
    port: portInfoMap[endPort].port,
    resourceType: portInfoMap[endPort].servicetype,
    selectContent: endPort,
    title: "Ending port-forward: " + endPort,
  };
}

async function portForWardByResource(
  node: KubernetesResourceNode
): Promise<IEndPortInfo> {
  let portList: string[] = [];

  const svcProfile = await nhctl.getServiceConfig(
    node.getKubeConfigPath(),
    node.getNameSpace(),
    node.getAppName(),
    node.name,
    node.resourceType
  );
  if (!svcProfile) {
    host.showErrorMessage("Port forward list is empty");
    return;
  }
  const portForwardList = svcProfile.devPortForwardList.filter(filter);
  if (portForwardList.length < 1) {
    host.showInformationMessage("No Port Forward");
    return;
  }

  portList = portForwardList.map((item) => {
    return `${item.localport}:${item.remoteport}(${item.status})`;
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
  const endPosition = endPort.indexOf("(");
  return {
    kubeConfigPath: node.getKubeConfigPath(),
    namespace: node.getNameSpace(),
    appName: node.getAppName(),
    workloadName: node.name,
    selectContent: endPort,
    port: endPort.substring(0, endPosition),
    resourceType: node.resourceType,
    title: "Ending port-forward: " + endPort.substring(0, endPosition),
  };
}

export default class PortForwardListCommand implements ICommand {
  command: string = PORT_FORWARD_LIST;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: KubernetesResourceNode | AppNode) {
    if (!node) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }
    let endPortInfo: IEndPortInfo = null;
    if (node instanceof AppNode) {
      endPortInfo = await portForWardListByApp(node);
    } else {
      endPortInfo = await portForWardByResource(node);
    }

    if (!endPortInfo) {
      return;
    }

    await nhctl.endPortForward(endPortInfo);

    await vscode.commands.executeCommand("Nocalhost.refresh", node);
    host.showInformationMessage(
      `Ended Port Forward ${endPortInfo.selectContent}`
    );
    host.getOutputChannel().show(true);
  }
}
