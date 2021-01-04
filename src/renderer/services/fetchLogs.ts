import { postMessage } from "../utils/index";

export interface IFetchLogsParam {
  logId: string;
  pod: string;
  container: string;
  kubeConfig: string;
  tail?: number;
}

export default function fetchLogs(param: IFetchLogsParam): void {
  const { logId, pod, container, kubeConfig, tail } = param;
  postMessage({
    type: "logs/fetch",
    payload: { logId, pod, container, kubeConfig, tail },
  });
}
