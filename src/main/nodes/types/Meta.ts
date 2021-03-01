export interface ObjectMeta {
  annotations: object;
  clusterName: string;
  creationTimestamp: Date;
  deletionGracePeriodSeconds: number;
  deletionTimestamp: Date;
  finalizers: Array<string>;
  generateName: string;
  generation: number;
  labels: object;
  managedFields: Array<ManagedFieldsEntry>;
  name: string;
  namespace: string;
  ownerReferences: Array<OwnerReference>;
  resourceVersion: string;
  selfLink: string;
  uid: string;
}

interface ManagedFieldsEntry {
  apiVersion: string;
  fieldsType: string;
  fieldsV1: any;
  manager: string;
  operation: string;
  time: Date;
}

interface OwnerReference {
  apiVersion: string;
  blockOwnerDeletion: boolean;
  controller: boolean;
  kind: string;
  name: string;
  uid: string;
}
