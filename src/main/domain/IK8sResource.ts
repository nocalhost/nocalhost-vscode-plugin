export interface IResourceStatus {
  conditions: Array<IStatus>;
  phase: string;
  numberReady?: number;
  replicas?: number;
  readyReplicas?: number;
}

export interface IStatus {
  lastTransitionTime: string;
  lastUpdateTime: string;
  message: string;
  reason: string;
  status: string;
  type: string;
}

export interface IK8sResource {
  apiVersion: string;
  status: string | IResourceStatus;
  kind: string;
  metadata: {
    annotations: {
      [key: string]: string;
    };
    ownerReferences?: boolean;
    creationTimestamp: string;
    labels: {
      [key: string]: string;
    };
    name: string;
    namespace: string;
    resourceVersion: string;
    deletionTimestamp?: string;
  };
}
