export namespace Associate {
  export type QueryResult = {
    kubeconfig_path: string;
    svc_pack: {
      ns: string;
      app: string;
      svc_type: string;
      svc: string;
      container: string;
    };
    sha: string;
    server: string;
    syncthing_status: {
      msg: string;
      status: SyncStatusType;
    };
  };
}

const SyncStatus = {
  outOfSync: "warning",
  disconnected: "debug-disconnect",
  scanning: "sync~spin",
  error: "error",
  syncing: "cloud-upload",
  idle: "check",
  end: "error",
};

type SyncStatusType = keyof typeof SyncStatus;

export function getIconIdByStatus(status: SyncStatusType) {
  return SyncStatus[status] || "error";
}

export interface IPortForward {
  daemonserverpid: number;
  port: string;
  reason: string;
  role: string;
  servicetype: string;
  status: string;
  sudo: boolean;
  svcName: string;
  updated: string;
}
