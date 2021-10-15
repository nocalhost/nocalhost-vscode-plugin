import host from "../host";
import { NodeInfo } from "../nodes/types/nodeType";
import { getContainers } from "../ctl/nhctl";

export async function getContainer(info: NodeInfo) {
  const containerNames = await getContainers(info);
  let containerName = containerNames[0];
  if (containerNames.length > 1) {
    containerName = await host.showQuickPick(containerNames);
  }
  return containerName;
}
