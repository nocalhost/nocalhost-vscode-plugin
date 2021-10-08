import * as vscode from "vscode";

import { IK8sResource } from "../domain";
import host from "../host";
import { get as _get } from "lodash";
import { NodeInfo } from "../typings/";
import { getContainers } from "../ctl/nhctl";

export async function getContainer(info: NodeInfo) {
  const containerNames = await getContainers(info);
  let containerName = containerNames[0];
  if (containerNames.length > 1) {
    containerName = await host.showQuickPick(containerNames);
  }
  return containerName;
}
