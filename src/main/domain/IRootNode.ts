import { ApplicationInfo, DevspaceInfo, V2ApplicationInfo } from "../api";
import { IUserInfo } from "./IUserInfo";
import AccountClusterService from "../clusters/AccountCluster";

export interface IRootNode {
  devSpaces: DevspaceInfo[];
  applications: V2ApplicationInfo[];
  old: ApplicationInfo[];
  isServer?: boolean;
  accountClusterService?: AccountClusterService;
  id?: string;
  localPath: string;
  createTime?: number;
  userInfo?: IUserInfo;
  kubeConfig: string;
}
