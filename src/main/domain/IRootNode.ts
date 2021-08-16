import { IUserInfo } from "./IUserInfo";
import { IApplicationInfo } from "./IApplicationInfo";

import { IDevSpaceInfo } from "./IDevSpaceInfo";
import { IV2ApplicationInfo } from "./IV2ApplicationInfo";

import { ClusterSource } from "../common/define";
import AccountClusterService from "../clusters/AccountCluster";

export interface IRootNode {
  devSpaces: IDevSpaceInfo[];
  applications: IV2ApplicationInfo[];
  clusterSource?: ClusterSource;
  accountClusterService?: AccountClusterService;
  id?: string;
  createTime?: number;
  clusterName?: string;
  userInfo?: IUserInfo;
  kubeConfigPath: string;
}
