export interface List {
  apiVersion: string,
  items: Array<Resource>,
  kind: string
}

export interface Status {
  lastTransitionTime: string
  lastUpdateTime: string
  message: string
  reason: string
  status: string
  type: string
}

export interface Resource {
  apiVersion: string,
  items: [],
  kind: string,
  metadata: {
    name: string;
    [value: string]: string;
  },
  status: string | {
    conditions: Array<Status>
  }
}