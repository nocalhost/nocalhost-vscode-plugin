import { IUserInfo } from "./IUserInfo";

import { IDevSpaceInfo } from "./IDevSpaceInfo";
import { IV2ApplicationInfo } from "./IV2ApplicationInfo";

import { ClusterSource } from "../common/define";
import AccountClusterService from "../clusters/AccountCluster";
import { ClustersState } from "../clusters";
import { IServiceAccountInfo } from ".";

export interface IRootNode {
  serviceAccount?: IServiceAccountInfo;
  applications: IV2ApplicationInfo[];
  clusterSource?: ClusterSource;
  accountClusterService?: AccountClusterService;
  id?: string;
  createTime?: number;
  clusterName?: string;
  userInfo?: IUserInfo;
  kubeConfigPath: string;
  state: ClustersState;
}
