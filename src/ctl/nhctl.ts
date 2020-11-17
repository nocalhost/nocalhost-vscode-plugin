import * as vscode from 'vscode';

import { execAsync } from "./shell";
import * as shell from 'shelljs';
import { Host } from '../host';
import * as fileStore from '../store/fileStore';
import { CURRENT_KUBECONFIG_FULLPATH } from '../constants';
import { ChildProcess, spawn } from 'child_process';
import * as readline from 'readline';
import { resolve } from 'path';

export async function install(host: Host, gitUrl: string) {
  if (!checkNhctl()) {
    return;
  }

  host.invokeInNewTerminal(`nhctl install -u ${gitUrl}  --force`, 'nhctl');
}

export async function debug(host: Host, appName: string, workloadName: string) {
  if (!checkNhctl()) {
    return;
  }

  const namespace = process.env.namespace || 'plugin-01';

  let disposes = [];

  host.log('replace image ...', true);
  await replaceImage(host, appName, workloadName,namespace);
  host.log('replace image end', true);
  host.log('', true);

  host.log('port forward ...', true);
  const portForwardDispose = await startPortForward(host, appName, workloadName, namespace);
  disposes.push(portForwardDispose);
  host.log('port forward end', true);
  host.log('', true);

  host.log('sync file ...', true);
  await syncFile(host, appName, workloadName,namespace);
  host.log('sync file end', true);
  host.log('', true);


  return disposes;
}

async function replaceImage(host: Host, appName: string, workLoadName: string, namespace?: string) {
  const replaceImageCommand = nhctlCommand(`dev start ${appName} -d ${workLoadName} ${namespace ? `-n ${namespace}`: ' '}`);
  await execAsync(host, replaceImageCommand, [], undefined, true);
}

function startPortForward(host: Host, appName: string, workloadName: string, namespace?: string) {

  const portForwardCommand = nhctlCommand(`port-forward ${appName} -d ${workloadName} ${namespace ? `-n ${namespace}`: ' '}`);

  return new Promise((resolve, reject) => {
    
    const proc = spawn(portForwardCommand, [], {
      shell: true
    });
  
    const rl = readline.createInterface({
      input: proc.stdout,
      output: proc.stdin
    });

    const _timeoutId = setTimeout(() => {
      proc.kill();
      vscode.window.showErrorMessage('port forward error. please check to log');
      reject('forward timeout');
    }, 1000 * 5);
  
    rl.on('line', (line) => {
      host.log(line, true);
      if (line.indexOf('Forwarding from') >= 0) {
        clearTimeout(_timeoutId);
        resolve(() => proc.kill());
      }
    });
  });
}
async function syncFile(host: Host, appName: string, workloadName: string, namespace?: string) {

  const syncFileCommand = nhctlCommand(`sync ${appName} -d ${workloadName}`);

  // host.invokeInNewTerminal(syncFileCommand, 'syscFile');

  await execAsync(host, syncFileCommand, [], undefined, true);
}

export async function endDebug(host: Host, appName: string, workLoadName: string, namespace?: string) {
  const end = nhctlCommand(`dev end ${appName} -d ${workLoadName} ${namespace ? `-n ${namespace}`: ' '}`);
  await execAsync(host, end, [], undefined, true);
}

function nhctlCommand(baseCommand: string) {
  const kubeconfig = fileStore.get(CURRENT_KUBECONFIG_FULLPATH);

  console.log('command: ', `nhctl ${baseCommand} --kubeconfig ${kubeconfig}`);
  
  return `nhctl ${baseCommand} --kubeconfig ${kubeconfig}`;
}

// function 

function checkNhctl() {
  const res = shell.which('nhctl');
  if (res.code === 0) {
    return true;
  }

  vscode.window.showErrorMessage('not found nhctl');

  return false;
}