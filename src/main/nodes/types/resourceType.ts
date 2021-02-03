export interface List {
  apiVersion: string;
  items: Array<Resource>;
  kind: string;
}

export interface Status {
  lastTransitionTime: string;
  lastUpdateTime: string;
  message: string;
  reason: string;
  status: string;
  type: string;
}

export interface Resource {
  apiVersion: string;
  items: [];
  kind: string;
  metadata: {
    name: string;
    [value: string]: any;
  };
  status: string | ResourceStatus;
}

export interface ResourceStatus {
  conditions: Array<Status>;
  phase: string;
}

export interface ControllerResource extends Resource {
  metadata: {
    name: string;
    labels: {};
    [value: string]: any;
  };
  spec: {
    selector: {
      matchLabels: { [value: string]: string };
      [value: string]: any;
    };
    [value: string]: any;
  };
}

export interface PodResource extends Resource {
  spec: {
    containers: Array<{
      name: string;
    }>;
  };
}
