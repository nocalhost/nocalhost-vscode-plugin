import LabelSelector from "./LabelSelector";
import { ObjectMeta } from "./Meta";
import PodTemplateSpec from "./PodTemplateSpec";

export default interface StatefulSet {
  apiVersion: string;
  kind: string;
  metadata: ObjectMeta;
  spec: StatefulSetSpec;
  status: StatefulSetStatus;
}

export interface StatefulSetStatus {
  collisionCount: number;
  conditions: Array<any>;
  currentReplicas: number;
  currentRevision: string;
  observedGeneration: number;
  readyReplicas: number;
  replicas: number;
  updateRevision: string;
  updatedReplicas: number;
}

export interface StatefulSetSpec {
  podManagementPolicy: string;
  replicas: number;
  revisionHistoryLimit: number;
  selector: LabelSelector;
  serviceName: string;
  template: PodTemplateSpec;
  updateStrategy: any;
  volumeClaimTemplates: any;
}
