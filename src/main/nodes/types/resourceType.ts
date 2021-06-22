import { IK8sResource } from "../../domain/IK8sResource";

export interface List {
  apiVersion: string;
  items: Array<IK8sResource>;
  kind: string;
}

export interface PodResource extends IK8sResource {
  spec: {
    containers: Array<{
      name: string;
    }>;
  };
}
