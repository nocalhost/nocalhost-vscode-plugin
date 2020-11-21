import { ChildProcess, spawn } from 'child_process';
import * as shell from 'shelljs';
import { Host } from '../host';


export function exec(host: Host, command: string, isLog?: boolean) {
  const res = shell.exec(command);
  if (isLog) {
    appendToNocalhostChannel(host, res.code, res.stdout, res.stderr);
  }
  
}

function appendToNocalhostChannel(host: Host, code: number, stdout: string, stderr: string) {
  if (code === 0) {
    host.log(stdout);
  } else {
    host.log(stderr);
  }
}

interface ShellResult {
  code: number;
  stdout: string;
  stderr: string;
}

export async function execAsync(host: Host, command: string, opts: any, callback?: (proc: ChildProcess) => void, isLog?: boolean) {
  return new Promise<ShellResult>((resolve) => {
    const proc = shell.exec(command, opts, (code, stdout, stderr) => {
      if (isLog) {
        appendToNocalhostChannel(host, code, stdout, stderr);
      }
      resolve({
        code,
        stdout,
        stderr
      });
    });

    if (callback) {
      callback(proc);
    }
  });
}

export async function execChildProcessAsync(host: Host, command: string, args: Array<any>) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {shell: true});
    let errorStr = '';
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(errorStr);
      }
    });
    
    proc.stdout.on('data', function (data) {
      host.log('' + data, true);
    });
    
    proc.stderr.on('data', function (data) {
      errorStr = data + '';
      host.log('' + data, true);
    });
  });
}