import * as vscode from 'vscode';

import { execAsync } from "./shell";
import * as shell from 'shelljs';
import { Host } from '../host';
import * as fileStore from '../store/fileStore';
import { CURRENT_KUBECONFIG_FULLPATH } from '../constants';
import { spawn } from 'child_process';
import * as readline from 'readline';
import { RSA_X931_PADDING } from 'constants';

export function install(host: Host, gitUrl: string) {
  if (!checkNhctl()) {
    return;
  }

  // 改成 child_process 拉取代码
  // host.invokeInNewTerminal(`nhctl install -u ${gitUrl}  --force`, 'nhctl'); // can not check proccess exit
  const installCommand = nhctlCommand(`install -u ${gitUrl}  --force`);
  
  return new Promise((resolve: (value: any) => void, reject) => {
    
    const proc = spawn('git', ['clone', 'https://github.com/nocalhost/bookinfo.git']);
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);

  
    // const rl = readline.createInterface({
    //   input: proc.stdout,
    //   output: proc.stdin
    // });

    // const _timeoutId = setTimeout(() => {
    //   proc.kill();
    //   vscode.window.showErrorMessage('install error. please check to log');
    //   reject('install timeout');
    // }, 1000 * 10);
  
    // rl.on('line', (line) => {
    //   host.log(line, true);
    //   if (line.indexOf('Forwarding from') >= 0) {
    //     clearTimeout(_timeoutId);
    //     resolve(() => proc.kill());
    //   }
    // });
  });
  // 递归获取当前终端的状态
}

export async function debug(host: Host, appName: string, workloadName: string) {
  if (!checkNhctl()) {
    return;
  }

  const namespace = process.env.namespace || 'plugin-02';

  host.log('replace image ...', true);
  vscode.window.showInformationMessage('replacing image ...');
  await replaceImage(host, appName, workloadName,namespace);
  host.log('replace image end', true);
  host.log('', true);

  host.log('port forward ...', true);
  vscode.window.showInformationMessage('port forwarding ...');
  const portForwardDispose = await startPortForward(host, appName, workloadName, namespace);
  host.pushDebugDispose(portForwardDispose);
  host.log('port forward end', true);
  host.log('', true);

  host.log('sync file ...', true);
  vscode.window.showInformationMessage('sysc file ...');
  await syncFile(host, appName, workloadName); // localhost dir
  host.log('sync file end', true);
  host.log('', true);
  // open workload container TODO: pause: wait xinxin finish
  // host.invokeInNewTerminal("echo helloworld", 'container');
}

async function replaceImage(host: Host, appName: string, workLoadName: string, namespace?: string) {
  const replaceImageCommand = nhctlCommand(`dev start ${appName} -d ${workLoadName}`);
  await execAsync(host, replaceImageCommand, [], undefined, true);
}

function startPortForward(host: Host, appName: string, workloadName: string, namespace?: string) {

  const portForwardCommand = nhctlCommand(`port-forward ${appName} -d ${workloadName} `);

  return new Promise((resolve: (value: any) => void, reject) => {
    
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
async function syncFile(host: Host, appName: string, workloadName: string, localDir = '/home/coding') {

  const syncFileCommand = nhctlCommand(`sync ${appName} -d ${workloadName} -l ${localDir}`);

  await execAsync(host, syncFileCommand, [], undefined, true);
}

export async function endDebug(host: Host, appName: string, workLoadName: string, namespace?: string) {
  const end = nhctlCommand(`dev end ${appName} -d ${workLoadName} `);
  await execAsync(host, end, [], undefined, true);
  // destroy some service
  host.disposeDebug();
}

function nhctlCommand(baseCommand: string) {
  const kubeconfig = fileStore.get(CURRENT_KUBECONFIG_FULLPATH);
  
  return `nhctl ${baseCommand} --kubeconfig ${kubeconfig}`;
}

function checkNhctl() {
  const res = shell.which('nhctl');
  if (res.code === 0) {
    return true;
  }

  vscode.window.showErrorMessage('not found nhctl');

  return false;
}