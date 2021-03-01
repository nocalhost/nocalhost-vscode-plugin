import { ObjectMeta } from "./Meta";

export default interface Pod {
  apiVersion: string;
  kind: string;
  metadata: ObjectMeta;
  spec: PodSpec;
  status: PodStatus;
}

export interface PodSpec {
  activeDeadlineSeconds: number;
  affinity: any;
  automountServiceAccountToken: boolean;
  containers: Array<any>;
  dnsConfig: any;
  dnsPolicy: string;
  enableServiceLinks: boolean;
  ephemeralContainers: Array<any>;
  hostAliases: Array<any>;
  hostIPC: boolean;
  hostNetwork: boolean;
  hostPID: boolean;
  hostname: string;
  imagePullSecrets: Array<any>;
  initContainers: Array<any>;
  nodeName: string;
  nodeSelector: object;
  overhead: object;
  preemptionPolicy: number;
  priority: number;
  priorityClassName: string;
  readinessGates: Array<any>;
  restartPolicy: string;
  runtimeClassName: string;
  schedulerName: string;
  securityContext: any;
  serviceAccount: string;
  serviceAccountName: string;
  shareProcessNamespace: boolean;
  subdomain: string;
  terminationGracePeriodSeconds: number;
  tolerations: Array<any>;
  topologySpreadConstraints: Array<any>;
  volumes: Array<any>;
}

export interface PodStatus {
  conditions: Array<any>;
  containerStatuses: Array<any>;
  ephemeralContainerStatuses: Array<any>;
  hostIP: string;
  initContainerStatuses: Array<any>;
  message: string;
  nominatedNodeName: string;
  phase: string;
  podIP: string;
  podIPs: Array<{
    ip: string;
  }>;
  qosClass: string;
  reason: string;
  startTime: Date;
}
