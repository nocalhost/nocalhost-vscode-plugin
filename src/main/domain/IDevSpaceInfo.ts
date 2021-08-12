import { IServiceAccountInfo } from ".";

export interface IDevSpaceInfo {
  id: number;
  spaceName: string;
  clusterId: number;
  spaceId?:number;
  kubeconfig: string;
  namespace: string;
  storageClass: string;
  devStartAppendCommand: Array<string>;
  spaceOwnType?: "Viewer" | "Owner" | string;
  [key: string]: any;
}
