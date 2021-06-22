import { ApplicationInfo, DevspaceInfo, V2ApplicationInfo } from "../api";
import { IUserInfo } from "./IUserInfo";
import AccountClusterService from "../clusters/AccountCluster";
import { ClusterSource } from "../clusters/interface";

export interface IRootNode {
  devSpaces: DevspaceInfo[];
  applications: V2ApplicationInfo[];
  clusterSource?: ClusterSource;
  accountClusterService?: AccountClusterService;
  id?: string;
  createTime?: number;
  userInfo?: IUserInfo;
  kubeConfigPath: string;
}
