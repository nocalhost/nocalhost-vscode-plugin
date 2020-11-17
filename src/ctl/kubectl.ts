import * as vscode from 'vscode';

import { execAsync } from "./shell";
import * as shell from 'shelljs';
import * as fileStore from '../store/fileStore';
import { CURRENT_KUBECONFIG_FULLPATH } from '../constants';
import { Host } from '../host';

export async function exec(host: Host, command: string, isLog?: boolean) {
  if (!checkKubectl()) {
    return;
  }

  const kubeconfig = fileStore.get(CURRENT_KUBECONFIG_FULLPATH);
  const res = await execAsync(host, `kubectl ${command} --kubeconfig ${kubeconfig} `, [], undefined, isLog);

  if (res.code === 0) {
    return res.stdout;
  }

  return Promise.reject(res.stderr);
}

export async function getResourceList(host: Host, kind:string) {
  const result = await exec(host, `get ${kind} -o json`);
  return result;
}

export async function loadResource(host: Host, kind: string, name: string) {
  const result = await exec(host, `get ${kind} ${name} -o yaml`);
  return result;
}

export async function getResourceObj(host: Host, kind: string, name: string) {
  const result = await exec(host, `get ${kind} ${name} -o json`);
  return result;
}

function checkKubectl() {
  const res = shell.which('kubectl');
  if (res.code === 0) {
    return true;
  }

  vscode.window.showErrorMessage('not found kubectl');

  return false;
}