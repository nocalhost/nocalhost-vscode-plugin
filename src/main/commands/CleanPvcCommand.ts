import { Deployment } from "./../nodes/workloads/controllerResources/deployment/Deployment";
import vscode from "vscode";

import ICommand from "./ICommand";

import * as nhctl from "../ctl/nhctl";
import { CLEAN_PVC } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { NodeType } from "../nodes/interfact";
import { AppNode } from "../nodes/AppNode";
import { DevSpaceNode } from "../nodes/DevSpaceNode";
import { IPvc } from "../domain";

function getCleanPvcDevSpaceFn(kubeConfigPath: string, namespace: string) {
  return async function (pvcName: string) {
    return await nhctl.cleanPvcByDevSpace({
      kubeConfigPath,
      namespace,
      pvcName,
    });
  };
}
function getCleanPvcOtherFn(props: {
  kubeConfig: string;
  namespace: string;
  appName: string;
  workloadName: string;
}) {
  const { kubeConfig, namespace, appName, workloadName } = props;
  return async function (pvcName: string) {
    return await nhctl.cleanPVC(
      kubeConfig,
      namespace,
      appName,
      workloadName,
      pvcName
    );
  };
}

async function getPvcListByDevSpace(node: DevSpaceNode): Promise<IPvcAttr[]> {
  const pvcs: IPvc[] = await nhctl.getPVCbyDevSpace({
    namespace: node.info.namespace,
    kubeConfigPath: node.getKubeConfigPath(),
  });
  return (pvcs || []).map((it: IPvc) => ({
    key: `name: ${it.name || ""}, storage_class: ${
      it.storageClass || ""
    }, status: ${it.status || ""}, capacity: ${it.capacity || ""}`,
    ...it,
  }));
}
type IPvcAttr = IPvc & {
  key: string;
};
async function getPvcListByOther(
  kubeConfigPath: string,
  namespace: string,
  appName: string,
  workloadName: string,
  workloadType?: string
): Promise<IPvcAttr[]> {
  const pvcs = await nhctl.listPVC({
    kubeConfigPath,
    namespace,
    appName,
    workloadName,
    workloadType,
  });

  return (pvcs || []).map((it: IPvc) => ({
    key: `${it.appName || ""}-${it.serviceName || ""}:${it.mountPath || ""}`,
    ...it,
  }));
}
export default class CleanPvcCommand implements ICommand {
  command: string = CLEAN_PVC;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: Deployment | AppNode | DevSpaceNode) {
    if (!node) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }
    let pvcs: IPvcAttr[] = [];
    let clearPvcFn = null;
    let appName: string,
      workloadName: string | undefined,
      workloadType: string = "",
      namespace: string = "";
    switch (node.type) {
      case NodeType.devSpace:
        workloadName = null;
        clearPvcFn = getCleanPvcDevSpaceFn(
          node.getKubeConfigPath(),
          (node as DevSpaceNode).info.namespace
        );
        pvcs = await getPvcListByDevSpace(node as DevSpaceNode);
        break;
      case NodeType.deployment:
      case NodeType.crd:
      case NodeType.statefulSet:
      case NodeType.job:
      case NodeType.daemonSet:
      case NodeType.cronjob:
      case NodeType.pod:
        const deployNode = node as Deployment;
        (appName = deployNode.getAppName()),
          (namespace = deployNode.getNameSpace()),
          (workloadType = deployNode.resourceType),
          (workloadName = deployNode.name);

        pvcs = await getPvcListByOther(
          node.getKubeConfigPath(),
          namespace,
          appName,
          workloadName,
          workloadType
        );
        clearPvcFn = getCleanPvcOtherFn({
          kubeConfig: node.getKubeConfigPath(),
          namespace,
          appName,
          workloadName,
        });
        break;
      case NodeType.appFolder:
        {
          workloadName = null;
          const appNode = node as AppNode;
          namespace = appNode.namespace;
          appName = appNode.name;

          clearPvcFn = getCleanPvcOtherFn({
            kubeConfig: node.getKubeConfigPath(),
            namespace,
            appName,
            workloadName,
          });
          pvcs = await getPvcListByOther(
            node.getKubeConfigPath(),
            namespace,
            appName,
            workloadName
          );
        }

        break;
      default:
        host.showInformationMessage(
          "Sorry, we do not support this type at the moment."
        );
        return;
    }

    const pvcMap = new Map<string, string>();
    const pvcNames = new Array<string>();
    pvcs.forEach((p: IPvcAttr) => {
      pvcMap.set(p.key, p.name);
      pvcNames.push(p.key);
    });
    if (pvcNames.length > 1) {
      pvcNames.unshift("ALL");
    }

    let result = await vscode.window.showQuickPick(pvcNames);
    let pvcName: string | undefined;
    if (!result) {
      return;
    }
    const confirmResult = await vscode.window.showInformationMessage(
      `Clear persistent volume: ${result} ?`,
      { modal: true },
      "Yes",
      "No"
    );
    if (confirmResult === "Yes") {
      if (result === "ALL") {
        pvcName = undefined;
      } else {
        pvcName = pvcMap.get(result);
      }
      clearPvcFn(pvcName);
      host.showInformationMessage("PVC has cleared");
    }
  }
}
