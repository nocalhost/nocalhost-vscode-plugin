export interface LoginInfo {
  username: string;
  from?: "plugin";
  password: string;
  baseUrl: string;
}

export enum ClusterSource {
  local = 0,
  server = 1,
}
