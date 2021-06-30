export interface IServiceAccountInfo {
  clusterId: number;
  kubeconfig: string;
  storageClass: string;
  privilege: boolean;
  namespacePacks: Array<{
    spaceId: number;
    namespace: string;
    spacename: string;
  }>;
}
