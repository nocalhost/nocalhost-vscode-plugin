export interface IApplicationInfo {
  id: number;
  context: string;
  status: number;
  installStatus: number;
  kubeconfig: string;
  cpu: number;
  memory: number;
  namespace: string;
  clusterId: number;
  devspaceId: number;
  spaceName: string;
  storageClass: string;
  devStartAppendCommand: Array<string>;
}
