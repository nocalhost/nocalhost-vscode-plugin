import assert = require("assert");
import * as vscode from "vscode";

import * as nhctl from "../../ctl/nhctl";
import host from "../../host";
import { KubernetesResourceNode } from "../../nodes/abstract/KubernetesResourceNode";

function ignoreRole(item: { role?: string }) {
  return item.role !== "SYNC";
}

export async function getAppPortForwardList(node: KubernetesResourceNode) {
  let array = await nhctl.getPortForwardList({
    kubeConfigPath: node.getKubeConfigPath(),
    namespace: node.namespace,
    appName: node.name,
  });
  array = array.filter(ignoreRole);

  if (array.length === 0) {
    host.showInformationMessage("No Port Forward");
    return Promise.reject();
  }

  const items = array.map(({ port, svcName, servicetype }) => {
    return {
      label: `${port}`,
      description: [servicetype, svcName].join("/"),
    };
  });

  const endPort = await vscode.window.showQuickPick(items);
  if (!endPort) {
    return Promise.reject();
  }
  return array.find((item) => item.port === endPort.label);
}

export async function getPortForwardList(
  node: KubernetesResourceNode
): Promise<vscode.QuickPickItem[]> {
  const svcProfile = await nhctl.getServiceConfig(
    node.getKubeConfigPath(),
    node.getNameSpace(),
    node.getAppName(),
    node.name,
    node.resourceType
  );

  assert(svcProfile, "Port forward list is empty");

  let array = svcProfile.devPortForwardList;

  array = array.filter(ignoreRole);

  return array.map(({ remoteport, localport, status }) => {
    return { label: `${localport}:${remoteport}`, description: status };
  });
}
