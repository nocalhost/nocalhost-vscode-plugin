import * as vscode from "vscode";

import { IK8sResource } from "../domain";
import host from "../host";
import { get as _get } from "lodash";

export async function getContainer(info: IK8sResource) {
  if (!info || !info.kind) {
    host.log("Missing kind field", true);
    return;
  }
  let containers: {
    name: string;
  }[] = _get(info, "spec.template.spec.containers");
  if (info.kind.toLowerCase() === "pod") {
    containers = _get(info, "spec.containers");
  }

  if (info.kind.toLowerCase() === "cronjob") {
    containers = _get(info, "spec.jobTemplate.spec.template.spec.containers");
  }

  const containerNames = (containers || [])
    .map(({ name }) => name)
    .filter(Boolean);
  if (!containerNames || containerNames.length === 0) {
    vscode.window.showErrorMessage("No container available");
    return;
  }
  let containerName = containerNames[0];
  if (containers.length > 1) {
    containerName = await host.showQuickPick(containerNames);
  }
  return containerName;
}
