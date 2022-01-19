import { IV2ApplicationInfo } from "./IV2ApplicationInfo";

import { ClusterSource } from "../common/define";
import { AccountClusterNode, ClustersState } from "../clusters";
import { IServiceAccountInfo } from ".";
import { LocalClusterNode } from "../clusters/LocalCuster";

export interface IRootNode {
  serviceAccount?: IServiceAccountInfo;
  applications: IV2ApplicationInfo[];
  clusterSource?: ClusterSource;
  // accountClusterService?: AccountClusterService;
  id?: string;
  createTime?: number;
  clusterName?: string;
  kubeConfigPath: string;
  state: ClustersState;

  clusterInfo?: AccountClusterNode | LocalClusterNode;
}
