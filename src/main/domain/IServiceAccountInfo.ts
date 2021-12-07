export interface IServiceAccountInfo {
  clusterId: number;
  kubeconfig: string;
  storageClass: string;
  privilege: boolean;
  privilegeType?: "CLUSTER_ADMIN" | "CLUSTER_VIEWER";
  namespacePacks: Array<{
    spaceId: number;
    namespace: string;
    spacename: string;
    spaceOwnType?: "Viewer" | "Owner" | string;
    isAsleep?: boolean;
  }>;
}
