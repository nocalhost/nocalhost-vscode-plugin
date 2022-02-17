import vscode from "vscode";

import host from "../../host";
import { KubernetesResourceNode } from "../../nodes/abstract/KubernetesResourceNode";
import { Deployment } from "../../nodes/workloads/controllerResources/deployment/Deployment";
import { StatefulSet } from "../../nodes/workloads/controllerResources/statefulSet/StatefulSet";
import * as nhctl from "../../ctl/nhctl";
import { ControllerResourceNode } from "../../nodes/workloads/controllerResources/ControllerResourceNode";
import { Pod } from "../../nodes/workloads/pod/Pod";

const placeHolder = "single: 1234:1234 multiple: 1234:1234,2345:2345.";

function validateInput(node: KubernetesResourceNode, value: string) {
  const expReg =
    /^([1-9][0-9]*)?:([1-9][0-9]*)(,([1-9][0-9]*)?:([1-9][0-9]*))*$/;
  const match = expReg.exec(value);

  if (!match) {
    return "please input correct string; example: " + placeHolder;
  }

  const errTip = "the number of port must be less than 65536";

  function check(port: string | null) {
    if (!port) {
      return true;
    }
    return port && Number(port) < 65536;
  }

  const checkPort = new Array<string>();

  if (node instanceof Deployment || node instanceof StatefulSet) {
    checkPort.push(match[1], match[2], match[4], match[5]);
  } else {
    checkPort.push(match[1], match[2]);
  }

  const errors = checkPort.filter((value) => {
    return !check(value);
  });

  if (errors.length > 0) {
    return errTip;
  }

  return undefined;
}

async function getPodName(node: KubernetesResourceNode) {
  let podName: string | undefined;
  const svcProfile = await nhctl.getServiceConfig(
    node.getKubeConfigPath(),
    node.getNameSpace(),
    node.getAppName(),
    node.name,
    node.resourceType
  );

  if (svcProfile?.develop_status !== "STARTED") {
    if (node instanceof ControllerResourceNode) {
      const kind = node.resourceType;
      const name = node.name;

      const podNameArr = await nhctl.getRunningPodNames({
        name,
        kind,
        namespace: node.getNameSpace(),
        kubeConfigPath: node.getKubeConfigPath(),
      });

      podName = podNameArr[0];

      if (podNameArr.length > 1) {
        podName = await vscode.window.showQuickPick(podNameArr);
      }
    } else if (node instanceof Pod) {
      podName = node.name;
    } else {
      host.showInformationMessage("Does not support this type at the moment.");
      return Promise.reject();
    }
  }
  return podName;
}
export async function addPortForward(node: KubernetesResourceNode) {
  const podName = await getPodName(node);

  const ports = await vscode.window.showInputBox({
    placeHolder,
    validateInput: validateInput.bind(null, node),
  });

  if (!ports) {
    return;
  }

  await nhctl.startPortForward(
    host,
    node.getKubeConfigPath(),
    node.getNameSpace(),
    node.getAppName(),
    node.name,
    "manual",
    node.resourceType,
    ports.split(","),
    podName
  );

  host.showInformationMessage("Started Port Forward");
}
