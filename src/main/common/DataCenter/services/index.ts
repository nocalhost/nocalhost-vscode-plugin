import DataCenter from "../index";

async function fetchApplicationMeta(applicationName: string): Promise<string> {
  const command: string = `nhctl plugin get ${applicationName}`;
  return await DataCenter.ctlFetch(command);
}

async function fetchLogs(
  pod: string,
  container: string,
  tail: number,
  kubeConfig: string
): Promise<string> {
  const command: string = `kubectl logs ${
    tail ? "--tail=" + tail : ""
  } ${pod} -c ${container} --kubeconfig ${kubeConfig}`;
  return await DataCenter.ctlFetch(command);
}

async function fetchDeployments(kubeConfig: string): Promise<string> {
  const command: string = `kubectl get Deployments -o json --kubeconfig ${kubeConfig}`;
  return await DataCenter.ctlFetch(command);
}

export default {
  fetchApplicationMeta,
  fetchLogs,
  fetchDeployments,
};
