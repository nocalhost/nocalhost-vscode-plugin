import * as vscode from 'vscode';

import { execAsync } from "./shell";
import * as shell from 'shelljs';
import * as fileStore from '../store/fileStore';
import { CURRENT_KUBECONFIG_FULLPATH } from '../constants';
import { Host } from '../host';
import { ControllerResource, List } from '../nodes/resourceType';

export async function exec(command: string) {
  if (!checkKubectl()) {
    return;
  }

  const kubeconfig = fileStore.get(CURRENT_KUBECONFIG_FULLPATH);
  const res = await execAsync(`kubectl ${command} --kubeconfig ${kubeconfig} `, []);

  if (res.code === 0) {
    return res.stdout;
  }

  return Promise.reject(res.stderr);
}

function getKubectlCommand(args: Array<string>) {
  return args.join(' ');
}

export async function getResourceList(host: Host, kind:string, label?: string) {
  let args: Array<string>;
  args = ['get', kind];
  if (label) {
    args.push('-l', label);
  }
  args.push('-o', 'json');

  const command = getKubectlCommand(args);
  const result = await exec(command);
  return result;
}

export async function loadResource(host: Host, kind: string, name: string, outputType = 'yaml') {
  const result = await exec(`get ${kind} ${name} -o ${outputType}`);
  return result;
}

export async function getResourceObj(host: Host, kind: string, name: string) {
  const result = await exec(`get ${kind} ${name} -o json`);
  return result;
}

export async function getControllerPod(host: Host, kind: string, name: string) {
  const res = await getResourceObj(host, kind, name);
  if (res) {
    const result = JSON.parse(res) as ControllerResource;
    const labels = result.spec.selector.matchLabels;
    let labelStrArr = new Array<string>();
    for (const key in labels) {
      labelStrArr.push(`${key}=${labels[key]}`);
    }
    const labelStr = labelStrArr.join(',');
    const listStr = await getResourceList(host, 'pods', labelStr);

    const resourceList = JSON.parse(listStr as string) as List; 

    return resourceList.items;
}
}

function checkKubectl() {
  const res = shell.which('kubectl');
  if (res.code === 0) {
    return true;
  }

  vscode.window.showErrorMessage('not found kubectl');

  return false;
}