import * as fs from "fs";
import * as path from "path";
import { NH_BIN } from "../../../constants";
import host from "../../../host";
import { nhctlCommand } from "../../../ctl/nhctl";
import DataCenter, { IExecCommandResult } from "../index";

export type ServiceResult = IExecCommandResult;

async function fetchApplicationMeta(
  applicationName: string
): Promise<ServiceResult> {
  const nhctlPath = path.resolve(
    NH_BIN,
    host.isWindow() ? "nhctl.exe" : "nhctl"
  );
  const command: string = `${nhctlPath} plugin get ${applicationName}`;
  return await DataCenter.execCommand(command);
}

async function describeApplication(
  kubeConfigPath: string,
  name: string
): Promise<ServiceResult> {
  const nhctlPath = path.resolve(
    NH_BIN,
    host.isWindow() ? "nhctl.exe" : "nhctl"
  );
  const command: string = `${nhctlPath} describe ${name} --kubeconfig ${kubeConfigPath}`;
  return await DataCenter.execCommand(command);
}

async function fetchApplicationConfig(
  kubeConfigPath: string,
  name: string
): Promise<ServiceResult> {
  const nhctlPath = path.resolve(
    NH_BIN,
    host.isWindow() ? "nhctl.exe" : "nhctl"
  );
  const command: string = `${nhctlPath} config get ${name} --kubeconfig ${kubeConfigPath}`;
  return await DataCenter.execCommand(command);
}

async function fetchNhctlVersion(dir: string = NH_BIN): Promise<string> {
  const nhctlPath = path.resolve(dir, host.isWindow() ? "nhctl.exe" : "nhctl");
  const command: string = `${nhctlPath} version`;
  const result = await DataCenter.execCommand(command);
  if (result.success) {
    const matched: string[] | null = result.value.match(
      /Version:\s*v(\d+(\.+\d+){2})/
    );
    if (!matched) {
      return;
    }
    return matched[1];
  }
  return null;
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
  appName: string,
  filePath: string,
  kubeConfig: string,
  namespace?: string
): Promise<ServiceResult> {
  // let applyPaths = [filePath];
  // if (isDir) {
  //   applyPaths = [];
  //   const files = fs.readdirSync(filePath);
  //   for (const fileName of files) {
  //     const fileFullPath = path.resolve(filePath, fileName);
  //     const stat = fs.statSync(fileFullPath);
  //     if (stat.isFile && path.extname(fileFullPath) === ".yaml") {
  //       applyPaths.push(fileFullPath);
  //     }
  //   }
  // }
  // if (applyPaths.length < 1) {
  //   return {
  //     success: false,
  //     value: "not found yaml file",
  //   };
  // }
  const command = nhctlCommand(
    kubeConfig,
    namespace,
    `apply ${appName} ${filePath}`
  );
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
