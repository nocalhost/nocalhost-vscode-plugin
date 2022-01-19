export interface IServiceAccountInfo {
  clusterId: number;
  kubeconfig: string;
  storageClass: string;
  privilege: boolean;
  privilegeType?: "CLUSTER_ADMIN" | "CLUSTER_VIEWER";
  kubeconfigType?: "vcluster";
  virtualCluster?: {
    serviceType: "ClusterIP" | "LoadBalancer" | "NodePort";
    servicePort: string;
    serviceAddress: string;
    serviceNamespace: string;
    hostClusterContext: string;
    virtualClusterContext: string;
  };
  namespacePacks: Array<{
    spaceId: number;
    namespace: string;
    spacename: string;
    spaceOwnType?: "Viewer" | "Owner" | string;
    isAsleep?: boolean;
    sleepStatus?: "wakeup" | "asleep";
  }>;
}
