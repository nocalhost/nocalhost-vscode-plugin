import * as vscode from "vscode";
import { execAsyncWithReturn } from "./shell";
import * as shell from "shelljs";
import {
  ControllerResource,
  List,
  PodResource,
  Resource,
  ResourceStatus,
} from "../nodes/types/resourceType";
import * as fileStore from "../store/fileStore";
import { DEFAULT_KUBE_CONFIG_FULLPATH } from "../constants";

export async function exec(command: string, kubeconfigPath: string) {
  if (!checkKubectl()) {
    return;
  }

  const res = await execAsyncWithReturn(
    `kubectl ${command} --kubeconfig ${kubeconfigPath}`,
    []
  );

  if (res.code === 0) {
    return res.stdout;
  }

  return Promise.reject(res.stderr);
}

function getKubectlCommand(args: Array<string>) {
  return args.join(" ");
}

export async function getResourceList(
  kubeconfigPath: string,
  kind: string,
  label?: string
) {
  let args: Array<string>;
  args = ["get", kind];
  if (label) {
    args.push("-l", label);
  }
  args.push("-o", "json");

  const command = getKubectlCommand(args);
  const result = await exec(command, kubeconfigPath);
  return result;
}

export async function loadResource(
  kubeconfigPath: string,
  kind: string,
  name: string,
  outputType = "yaml"
) {
  const result = await exec(
    `get ${kind} ${name} -o ${outputType}`,
    kubeconfigPath || fileStore.get(DEFAULT_KUBE_CONFIG_FULLPATH)
  );
  return result;
}

export async function getResourceObj(
  kubeconfigPath: string,
  kind: string,
  name: string
) {
  const result = await exec(`get ${kind} ${name} -o json`, kubeconfigPath);
  return result;
}

export async function getControllerPod(
  kubeconfigPath: string,
  kind: string,
  name: string
) {
  const res = await getResourceObj(kubeconfigPath, kind, name);
  if (res) {
    const result = JSON.parse(res) as ControllerResource;
    const labels = result.spec.selector.matchLabels;
    let labelStrArr = new Array<string>();
    for (const key in labels) {
      labelStrArr.push(`${key}=${labels[key]}`);
    }
    const labelStr = labelStrArr.join(",");
    const listStr = await getResourceList(kubeconfigPath, "pods", labelStr);

    const resourceList = JSON.parse(listStr as string) as List;

    return resourceList.items;
  }
}

export async function getContainerNames(
  podName: string,
  kubeConfigPath: string
) {
  const podStr = await loadResource(kubeConfigPath, "pod", podName, "json");
  const pod = JSON.parse(podStr as string) as PodResource;
  const containerNameArr = pod.spec.containers.map((c) => {
    return c.name;
  });

  return containerNameArr;
}

export async function getPodNames(
  name: string,
  kind: string,
  kubeConfigPath: string
) {
  let podNameArr: Array<string> = [];
  let resArr = await getControllerPod(kubeConfigPath, kind, name);
  if (resArr && resArr.length <= 0) {
    return podNameArr;
  }
  // filter
  resArr = (resArr as Array<Resource>).filter((res) => {
    if (res.status) {
      const status = res.status as ResourceStatus;
      if (status.phase === "Running") {
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

function checkKubectl() {
  const res = shell.which("kubectl");
  if (res.code === 0) {
    return true;
  }

  vscode.window.showErrorMessage("not found kubectl");

  return false;
}
