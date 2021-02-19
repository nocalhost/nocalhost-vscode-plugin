import { spawn } from "child_process";
import { Host } from "../host";
import axios from "axios";
import logger from "../utils/logger";

class Git {
  public async clone(host: Host, gitUrl: string, args: Array<string>) {
    // HTTP CHECK
    let beforeCommand: string | undefined;
    if (gitUrl.indexOf("http") === 0) {
      const checkUrl = `${gitUrl}/info/refs?service=git-upload-pack`;
      const httpClient = axios.create();
      const defaultHeaders = axios.defaults.headers;
      defaultHeaders["User-Agent"] = "git/nocalhost-plugin";
      await httpClient
        .get(checkUrl, { headers: defaultHeaders })
        .catch(async (data) => {
          if (data && data.response && data.response.status === 401) {
            const username = await host.showInputBox({
              placeHolder: "username",
              prompt: "please input your username of git",
            });
            if (!username) {
              return;
            }
            const password = await host.showInputBox({
              placeHolder: "password",
              prompt: "please input your password of git",
              password: true,
            });
            if (!password) {
              return;
            }

            const scheme = gitUrl.split("://");
            gitUrl = `${scheme[0]}://${username}:${password}@${scheme[1]}`;
          } else {
            throw data;
          }
        });
    } else {
      beforeCommand = 'GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no"';
    }
    await this.execComandsByArgs(
      host,
      ["clone", gitUrl, ...args],
      beforeCommand
    );
  }

  public async execComandsByArgs(
    host: Host,
    args: Array<string>,
    beforeCommand?: string
  ) {
    let argsStr = "git";
    if (beforeCommand) {
      argsStr = `${beforeCommand} git`;
    }
    args.forEach((arg) => {
      argsStr += ` ${arg}`;
    });
    await this.exec(host, argsStr);
  }

  // TODO: HTTP SSH
  public async exec(host: Host, command: string) {
    host.log(`[cmd] ${command}`, true);
    logger.info(`[cmd] ${command}`);
    return new Promise((resolve, reject) => {
      const proc = spawn(`${command}`, [], { shell: true });
      let errorStr = "";
      proc.on("close", (code) => {
        if (code === 0) {
          resolve(null);
        } else {
          reject(errorStr);
        }
      });

      proc.stdout.on("data", function (data) {
        host.log("" + data, true);
      });

      proc.stderr.on("data", function (data) {
        errorStr = data + "";
        host.log("" + data, true);
        logger.error(`[cmd] ${command} error: ${data}`);
      });
    });
  }
}

export default new Git();
