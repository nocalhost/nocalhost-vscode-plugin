import { SERVER_CLUSTER_LIST, LOCAL_PATH } from "../constants";
import host from "../host";

export function isExistCluster() {
  const globalClusterAccountList =
    host.getGlobalState(SERVER_CLUSTER_LIST) || [];
  const localPaths = (host.getGlobalState(LOCAL_PATH) as string[]) || [];
  return globalClusterAccountList.length > 0 || localPaths.length > 0;
}
