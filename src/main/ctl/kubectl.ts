import * as fs from "fs";

import { execAsyncWithReturn } from "./shell";
import {
  ControllerResource,
  List,
  PodResource,
  Resource,
  ResourceStatus,
} from "../nodes/types/resourceType";
import host from "../host";
import { DEFAULT_KUBE_CONFIG_FULLPATH } from "../constants";
import { DevspaceInfo } from "../api";

export async function exec(command: string, kubeconfigPath: string) {
  const execCommand = `kubectl ${command} --kubeconfig ${kubeconfigPath}`;
  const res = await execAsyncWithReturn(execCommand, []);

  console.log("execCommand", execCommand);
  if (res.code === 0) {
    return res.stdout;
  }

  return Promise.reject(new Error(`command: ${execCommand} \n ${res.stderr}`));
}

function getKubectlCommand(args: Array<string>) {
  return args.join(" ");
}

export async function getResourceList(
  kubeconfigPath: string,
  kind: string,
  namespace?: string,
  label?: string
) {
  let args: Array<string>;
  args = ["get", kind];
  if (label) {
    args.push("-l", label);
  }
  if (namespace) {
    args.push("-n", namespace);
  }
  args.push("-o", "json");

  const command = getKubectlCommand(args);
  const result = await exec(command, kubeconfigPath);
  return result;
}

export async function getAllNamespace(
  kubeconfigPath: string,
  defaultNamespace: string
) {
  const devspaces = new Array<DevspaceInfo>();
  const kubeConfig = fs.readFileSync(kubeconfigPath);
  let str = await getResourceList(kubeconfigPath, "ns").catch(() => {});
  if (!str) {
    const devspace: DevspaceInfo = {
      id: 0,
      userId: 0,
      spaceName: defaultNamespace,
      clusterId: 0,
      kubeconfig: `${kubeConfig}`,
      memory: 0,
      cpu: 0,
      spaceResourceLimit: "",
      namespace: defaultNamespace,
      status: 0,
      storageClass: "",
      devStartAppendCommand: [],
    };

    devspaces.push(devspace);

    return devspaces;
  }
  const obj = JSON.parse(str) as Resource;
  obj.items.forEach((ns) => {
    const devspace: DevspaceInfo = {
      id: 0,
      userId: 0,
      spaceName: ns["metadata"]["name"],
      clusterId: 0,
      kubeconfig: `${kubeConfig}`,
      memory: 0,
      cpu: 0,
      spaceResourceLimit: "",
      namespace: ns["metadata"]["name"],
      status: 0,
      storageClass: "",
      devStartAppendCommand: [],
    };

    devspaces.push(devspace);
  });

  return devspaces;
}

export async function loadResource(
  kubeconfigPath: string,
  kind: string,
  namespace: string,
  name: string,
  outputType = "yaml"
) {
  const command = `get ${kind} ${name} -n ${namespace} -o ${outputType}`;

  const result = await exec(
    command,
    kubeconfigPath || host.getGlobalState(DEFAULT_KUBE_CONFIG_FULLPATH)
  );
  return result;
}

export async function getResourceObj(
  kubeconfigPath: string,
  kind: string,
  namespace: string,
  name: string
) {
  const result = await exec(
    `get ${kind} ${name} -n ${namespace} -o json`,
    kubeconfigPath
  );
  return result;
}

export async function getControllerPod(
  kubeconfigPath: string,
  kind: string,
  namespace: string,
  name: string
) {
  const res = await getResourceObj(kubeconfigPath, kind, namespace, name);
  if (res) {
    const result = JSON.parse(res) as ControllerResource;
    const labels = result.spec.selector.matchLabels;
    let labelStrArr = new Array<string>();
    for (const key in labels) {
      labelStrArr.push(`${key}=${labels[key]}`);
    }
    const labelStr = labelStrArr.join(",");
    const listStr = await getResourceList(
      kubeconfigPath,
      "pods",
      namespace,
      labelStr
    );

    const resourceList = JSON.parse(listStr as string) as List;

    return resourceList.items;
  }
}

export async function getContainerNames(
  podName: string,
  kubeConfigPath: string,
  namespace: string
) {
  const podStr = await loadResource(
    kubeConfigPath,
    "pod",
    namespace,
    podName,
    "json"
  );
  const pod = JSON.parse(podStr as string) as PodResource;
  const containerNameArr = pod.spec.containers.map((c) => {
    return c.name;
  });

  return containerNameArr;
}

/**
 * get all pod name, except terminating pod
 * @param name resourceName
 * @param kind resource kind
 * @param kubeConfigPath kubeconfig path
 * @returns pod name array
 */
export async function getPodNames(
  name: string,
  kind: string,
  namespace: string,
  kubeConfigPath: string
) {
  let podNameArr: Array<string> = [];
  let resArr = await getControllerPod(kubeConfigPath, kind, namespace, name);
  if (resArr && resArr.length <= 0) {
    return podNameArr;
  }
  resArr = (resArr as Array<Resource>).filter((res) => {
    if (res.status) {
      const status = res.status as ResourceStatus;
      if (status.phase === "Running" && res.metadata["deletionTimestamp"]) {
        return false;
      }
    }

    return true;
  });
  podNameArr = (resArr as Array<Resource>).map((res) => {
    return res.metadata.name;
  });
  return podNameArr;
}
/**
 * get all running pod name, except terminating pod
 * @param name resourceName
 * @param kind resource kind
 * @param kubeConfigPath kubeconfig path
 * @returns pod name array
 */
export async function getRunningPodNames(
  name: string,
  kind: string,
  namespace: string,
  kubeConfigPath: string
) {
  let podNameArr: Array<string> = [];
  let resArr = await getControllerPod(kubeConfigPath, kind, namespace, name);
  if (resArr && resArr.length <= 0) {
    return podNameArr;
  }
  // filter
  resArr = (resArr as Array<Resource>).filter((res) => {
    if (res.status) {
      const status = res.status as ResourceStatus;
      if (status.phase === "Running" && !res.metadata["deletionTimestamp"]) {
        return true;
      }
    }

    return false;
  });
  podNameArr = (resArr as Array<Resource>).map((res) => {
    return res.metadata.name;
  });
  return podNameArr;
}
