import { spawn } from 'child_process';
import { Host } from '../host';

class Git {
  public async clone(host: Host, gitUrl: string, args: Array<string>) {
    await this.execComandsByArgs(host, ['clone', gitUrl, ...args]);
  }

  public async execComandsByArgs(host: Host, args: Array<string>) {
    let argsStr = '';
    args.forEach((arg) => {
      argsStr += `${arg} `;
    });
    await this.exec(host, argsStr);
  }

  public async exec(host: Host, command: string) {
    host.log(`[cmd] git ${command}`, true);
    return new Promise((resolve, reject) => {
      const proc = spawn(`git ${command}`, [], {shell: true});
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
}

export default new Git();