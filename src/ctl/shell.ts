import { ChildProcess } from 'child_process';
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