import { ApplicationInfo, DevspaceInfo, V2ApplicationInfo } from "../api";
import { IUserInfo } from "./IUserInfo";

export interface IRootNode {
  devSpaces: DevspaceInfo[];
  applications: V2ApplicationInfo[];
  old: ApplicationInfo[];
  isServer?: boolean;
  id?: string;
  localPath: string;
  createTime?: number;
  userInfo?: IUserInfo;
  kubeConfig: string;
}
