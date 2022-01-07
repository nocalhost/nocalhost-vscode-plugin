import { IServiceAccountInfo } from ".";

export interface IDevSpaceInfo {
  id: number;
  spaceName: string;
  clusterId: number;
  spaceId?: number;
  kubeconfig: string;
  namespace: string;
  storageClass: string;
  devStartAppendCommand: Array<string>;
  spaceOwnType?: "Viewer" | "Owner" | string;
  isAsleep?: "asleep" | "wakeup";
  [key: string]: any;
}
