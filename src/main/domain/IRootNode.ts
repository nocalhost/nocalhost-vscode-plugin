import { IUserInfo } from "./IUserInfo";

import { IV2ApplicationInfo } from "./IV2ApplicationInfo";

import { ClusterSource } from "../common/define";
import { ClustersState } from "../clusters";
import { IServiceAccountInfo } from ".";
import { LoginInfo } from "../clusters/interface";

export interface IRootNode {
  serviceAccount?: IServiceAccountInfo;
  applications: IV2ApplicationInfo[];
  clusterSource?: ClusterSource;
  loginInfo?: LoginInfo;
  // accountClusterService?: AccountClusterService;
  id?: string;
  createTime?: number;
  clusterName?: string;
  userInfo?: IUserInfo;
  kubeConfigPath: string;
  state: ClustersState;
}
