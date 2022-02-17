import assert from "assert";
import net from "net";
import path from "path";
import semver from "semver";
import { existsSync, mkdirSync, watch } from "fs";
import { commands, DebugConfiguration } from "vscode";
import { v4 } from "uuid";
import { delay } from "lodash-es";

import logger from "../../utils/logger";
import { getPromiseWithAbort } from "../../utils";
import host from "../../host";
import { IDebugProvider } from "./IDebugProvider";
import { exec } from "../../ctl/shell";
import { Language } from "../../service/configService";

export class GoDebugProvider extends IDebugProvider {
  name: Language = "go";
  requireExtensions: string[] = ["golang.go"];

  downloadUrl: string = "https://go.dev/dl/";
  commandName: string = this.name;

  socket: net.Socket;

  getDebugConfiguration(
    name: string,
    port: number,
    remoteRoot: string
  ): DebugConfiguration {
    // https://github.com/golang/vscode-go/blob/master/docs/debugging.md
    return {
      name,
      type: "go",
      request: "attach",
      mode: "remote",
      remotePath: remoteRoot,
      port,
      host: "127.0.0.1",
    };
  }
  async waitDebuggerStop() {
    try {
      await this.call("Command", [{ name: "halt" }]);
      await this.call("Detach", []);

      await this.socket.end();
    } catch (err) {
      logger.error("stopDebug error", err);

      host.showErrorMessage(
        `Stop "dlv" fail,please kill the "dlv" process in the container.`
      );
    }
  }

  async checkExtensionDependency(): Promise<void> {
    const env = await exec({
      command: "go",
      args: ["env", "-json", "GOPATH"],
    })
      .promise.then((res) => {
        return JSON.parse(res.stdout) as { GOPATH: string };
      })
      .catch((err) => {
        logger.error("checkExtensionDependency", err);
        return Promise.reject(Error(`Failed to run "go env"`));
      });

    const binPath = path.join(env["GOPATH"], "bin");

    if (!existsSync(binPath)) {
      mkdirSync(binPath, { recursive: true });
    }

    let dlvName = "dlv";
    if (host.isWindow()) {
      dlvName += ".exe";
    }

    if (!existsSync(path.join(binPath, dlvName))) {
      return await host.withProgress(
        {
          title: `Wait for "dlv" installation to complete ...`,
          cancellable: true,
        },
        async (_, token) => {
          commands.executeCommand("go.tools.install", [
            {
              name: "dlv",
              importPath: "github.com/go-delve/delve/cmd/dlv",
              modulePath: "github.com/go-delve/delve",
              replacedByGopls: false,
              isImportant: true,
              description: "Go debugger (Delve)",
              minimumGoVersion: semver.coerce("1.12"), // dlv requires 1.12+ for build
            },
          ]);
          const { promise, fsWatcher } = await this.waitForInstallSuccessful(
            binPath,
            dlvName
          );

          token.onCancellationRequested(() => {
            fsWatcher.close();

            host.showWarnMessage("Cancel Waiting.");
          });

          await promise;
        }
      );
    }
  }

  private waitForInstallSuccessful(dlvPath: string, dlvName: string) {
    const fsWatcher = watch(dlvPath);

    const { promise, abort } = getPromiseWithAbort<void>(
      new Promise((resolve, reject) => {
        fsWatcher.on("change", (eventType, fileName) => {
          if (eventType === "rename" && fileName === dlvName) {
            resolve();
          }
        });
        fsWatcher.on("close", reject);
      })
    );

    promise.finally(() => {
      fsWatcher.close();
    });

    delay(() => {
      abort("Waiting timeout.");
    }, 60_000 * 5);

    return { fsWatcher, promise };
  }

  private call<T>(command: string, params: any[], timeout = 0): Thenable<T> {
    const id = v4();
    const method = `RPCServer.${command}`;

    return new Promise<T>((resolve, reject) => {
      const err = new Error(`Then Call "${method}" timed out.`);
      if (timeout) {
        setTimeout(() => {
          reject(err);
        }, timeout * 1000);
      }

      this.socket.once("data", (data) => {
        const {
          id: rid,
          error,
          result,
        } = JSON.parse(data.toString()) as {
          id: string;
          result: T;
          error?: string;
        };

        if (rid === id) {
          if (error) {
            reject(new Error(error));
          } else {
            resolve(result);
          }
        }
      });
      this.socket.once("error", reject);

      this.socket.write(
        JSON.stringify({
          jsonrpc: "2.0",
          method,
          params,
          id,
        })
      );
    });
  }
  private async connect(port: number) {
    if (this.socket && this.socket.connecting) {
      return Promise.resolve();
    }

    this.socket = net.connect(port);

    this.socket.on("data", (data) => {
      console.warn("data", data);
    });

    return new Promise((res, rej) => {
      this.socket.once("connect", res);
      this.socket.once("error", rej);
      this.socket.once("close", rej);
    });
  }
  async waitDebuggerStart(port: number) {
    await this.connect(port);

    const result = await this.call("GetVersion", [], 2);

    assert(result);

    logger.debug("dlv GetVersion", result);
  }
}
