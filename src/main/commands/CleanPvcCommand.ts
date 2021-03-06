import * as vscode from "vscode";

import ICommand from "./ICommand";

import * as nhctl from "../ctl/nhctl";
import { CLEAN_PVC } from "./constants";
import registerCommand from "./register";
import { Deployment } from "../nodes/workloads/controllerResources/deployment/Deployment";
import host from "../host";
import { AppNode } from "../nodes/AppNode";

export default class CleanPvcCommand implements ICommand {
  command: string = CLEAN_PVC;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: Deployment | AppNode) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    let appName: string, workloadName: string | undefined;
    if (node instanceof Deployment) {
      appName = node.getAppName();
      workloadName = node.name;
    } else if (node instanceof AppNode) {
      appName = node.name;
    } else {
      host.showInformationMessage("Not support the type");
      return;
    }

    const pvcs = await nhctl.listPVC(
      node.getKubeConfigPath(),
      appName,
      workloadName
    );
    const pvcMap = new Map<string, string>();
    const pvcNames = new Array<string>();
    pvcs.map((p) => {
      const key = `${p.appName}-${p.serviceName}:${p.mountPath}`;
      pvcMap.set(key, p.name);
      pvcNames.push(key);
    });
    pvcNames.unshift("ALL");
    let result = await vscode.window.showQuickPick(pvcNames);
    let pvcName: string | undefined;
    if (!result) {
      return;
    }

    if (result === "ALL") {
      pvcName = undefined;
    } else {
      pvcName = pvcMap.get(result);
    }
    await nhctl.cleanPVC(
      node.getKubeConfigPath(),
      appName,
      workloadName,
      pvcName
    );
    host.showInformationMessage("cleared pvc");
  }
}
