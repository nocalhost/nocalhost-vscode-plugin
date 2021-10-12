import * as assert from "assert";
import * as net from "net";
import { DebugConfiguration } from "vscode";
import { v4 } from "uuid";

import logger from "../../utils/logger";
import host from "../../host";
import { IDebugProvider } from "./IDebugProvider";

export class GoDebugProvider extends IDebugProvider {
  name: string = "Golang";
  requireExtensions: string[] = ["golang.go"];
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
        "Stop dlv fail,please kill the dlv process in the container."
      );
    }
  }

  call<T>(command: string, params: any[], timeout = 0): Thenable<T> {
    const id = v4();
    const method = `RPCServer.${command}`;

    return new Promise<T>((resolve, reject) => {
      const err = new Error(`Then Call ${method} timed out.`);
      if (timeout) {
        setTimeout(() => {
          reject(err);
        }, timeout * 1000);
      }

      this.socket.once("data", (data) => {
        const { id: rid, error, result } = JSON.parse(data.toString()) as {
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
