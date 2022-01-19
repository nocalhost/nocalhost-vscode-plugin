import { SERVER_CLUSTER_LIST, LOCAL_PATH } from "../constants";
import host from "../host";

export function isExistCluster() {
  const globalClusterAccountList =
    host.getGlobalState<Array<string>>(SERVER_CLUSTER_LIST) || [];
  const localPaths = host.getGlobalState<Array<string>>(LOCAL_PATH) || [];
  return globalClusterAccountList.length > 0 || localPaths.length > 0;
}
