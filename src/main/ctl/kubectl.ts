import * as vscode from "vscode";
import { execAsync } from "./shell";
import * as shell from "shelljs";
import { ControllerResource, List } from "../nodes/types/resourceType";
import * as fileStore from "../store/fileStore";
import { DEFAULT_KUBE_CONFIG_FULLPATH } from "../constants";

export async function exec(command: string, kubeconfigPath: string) {
  if (!checkKubectl()) {
    return;
  }

  const res = await execAsync(
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

function checkKubectl() {
  const res = shell.which("kubectl");
  if (res.code === 0) {
    return true;
  }

  vscode.window.showErrorMessage("not found kubectl");

  return false;
}
