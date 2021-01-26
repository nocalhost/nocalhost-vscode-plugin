import DataCenter, { IExecCommandResult } from "../index";

export type ServiceResult = IExecCommandResult;

async function fetchApplicationMeta(
  applicationName: string
): Promise<ServiceResult> {
  const command: string = `nhctl plugin get ${applicationName}`;
  return await DataCenter.execCommand(command);
}

async function fetchLogs(
  pod: string,
  container: string,
  tail: number,
  kubeConfig: string
): Promise<ServiceResult> {
  const command: string = `kubectl logs ${
    tail ? "--tail=" + tail : ""
  } ${pod} -c ${container} --kubeconfig ${kubeConfig}`;
  return await DataCenter.execCommand(command);
}

async function fetchDeployments(kubeConfig: string): Promise<ServiceResult> {
  const command: string = `kubectl get Deployments -o json --kubeconfig ${kubeConfig}`;
  return await DataCenter.execCommand(command);
}

async function fetchKubernetesResource(
  kind: string,
  name: string,
  kubeConfig: string
): Promise<ServiceResult> {
  const command: string = `kubectl get ${kind} ${name} -o yaml --kubeconfig ${kubeConfig}`;
  return await DataCenter.execCommand(command);
}

async function fetchNHResource(name: string): Promise<ServiceResult> {
  const command: string = `nhctl describe ${name}`;
  return await DataCenter.execCommand(command);
}

async function applyKubernetesObject(
  filePath: string,
  kubeConfig: string,
  isDir = false
): Promise<ServiceResult> {
  const command: string = `kubectl apply ${isDir ? "-k" : "-f"} ${filePath} --kubeconfig ${kubeConfig}`;
  return await DataCenter.execCommand(command);
}

async function deleteKubernetesObject(
  kind: string,
  objectName: string,
  namespace: string,
  kubeConfig: string
): Promise<ServiceResult> {
  const command: string = `kubectl delete ${kind} ${objectName} -n ${namespace} --kubeconfig ${kubeConfig}`;
  return await DataCenter.execCommand(command);
}

export default {
  fetchApplicationMeta,
  fetchLogs,
  fetchDeployments,
  fetchKubernetesResource,
  fetchNHResource,
  applyKubernetesObject,
  deleteKubernetesObject,
};
