import * as fs from "fs";
import * as path from "path";
import DataCenter, { IExecCommandResult } from "../index";

export type ServiceResult = IExecCommandResult;

async function fetchApplicationMeta(
  applicationName: string
): Promise<ServiceResult> {
  const command: string = `nhctl plugin get ${applicationName}`;
  return await DataCenter.execCommand(command);
}

async function describeApplication(name: string): Promise<ServiceResult> {
  const command: string = `nhctl describe ${name}`;
  return await DataCenter.execCommand(command);
}

async function fetchApplicationConfig(name: string): Promise<ServiceResult> {
  const command: string = `nhctl config get ${name}`;
  return await DataCenter.execCommand(command);
}

async function fetchNhctlVersion(): Promise<ServiceResult> {
  const command: string = `nhctl version`;
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

async function applyKubernetesObject(
  filePath: string,
  kubeConfig: string,
  isDir = false
): Promise<ServiceResult> {
  let applyPaths = [filePath];
  if (isDir) {
    applyPaths = [];
    const files = fs.readdirSync(filePath);
    for (const fileName of files) {
      const fileFullPath = path.resolve(filePath, fileName);
      const stat = fs.statSync(fileFullPath);
      if (stat.isFile && path.extname(fileFullPath) === ".yaml") {
        applyPaths.push(fileFullPath);
      }
    }
  }
  if (applyPaths.length < 1) {
    return {
      success: false,
      value: "not found yaml file",
    };
  }
  const command: string = `kubectl apply -f ${applyPaths.join(
    " -f "
  )} --kubeconfig ${kubeConfig}`;
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
  fetchNhctlVersion,
  fetchLogs,
  fetchDeployments,
  fetchKubernetesResource,
  fetchApplicationConfig,
  describeApplication,
  applyKubernetesObject,
  deleteKubernetesObject,
};
