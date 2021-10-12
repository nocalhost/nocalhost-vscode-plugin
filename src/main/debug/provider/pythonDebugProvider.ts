import { DebugConfiguration } from "vscode";
import * as assert from "assert";
import * as net from "net";

import { IDebugProvider } from "./IDebugProvider";
import logger from "../../utils/logger";

const TWO_CRLF = "\r\n\r\n";

const HEADER_LINESEPARATOR = /\r?\n/; // allow for non-RFC 2822 conforming line separators
const HEADER_FIELDSEPARATOR = /: */;

interface ProtocolMessage {
  /**
   * Sequence number (also known as message ID). For protocol messages of type
   * 'request' this ID can be used to cancel the request.
   */
  seq: number;

  /**
   * Message type.
   * Values: 'request', 'response', 'event', etc.
   */
  type: "request" | "response" | "event" | string;
}

interface Response extends ProtocolMessage {
  /**
   * Sequence number of the corresponding request.
   */
  request_seq: number;

  /**
   * Outcome of the request.
   * If true, the request was successful and the 'body' attribute may contain
   * the result of the request.
   * If the value is false, the attribute 'message' contains the error in short
   * form and the 'body' may contain additional information (see
   * 'ErrorResponse.body.error').
   */
  success: boolean;

  /**
   * The command requested.
   */
  command: string;
}
interface Request extends ProtocolMessage {
  type: "request";

  /**
   * The command to execute.
   */
  command: string;

  /**
   * Object containing arguments for the command.
   */
  arguments?: any;
}

export class PythonDebugProvider extends IDebugProvider {
  name: string = "Python";
  requireExtensions: string[] = ["ms-python.python"];
  socket: net.Socket;

  getDebugConfiguration(
    name: string,
    port: number,
    remoteRoot: string
  ): DebugConfiguration {
    // https://github.com/xdebug/vscode-php-debug
    return {
      name,
      type: "python",
      request: "attach",
      pathMappings: [
        {
          localRoot: "${workspaceFolder}",
          remoteRoot,
        },
      ],
      connect: {
        port,
        host: "127.0.0.1",
      },
    };
  }

  private rawData = Buffer.allocUnsafe(0);
  private contentLength = -1;
  private handleData(data: Buffer) {
    this.rawData = Buffer.concat([this.rawData, data]);

    while (true) {
      if (this.contentLength >= 0) {
        if (this.rawData.length >= this.contentLength) {
          const message = this.rawData.toString("utf8", 0, this.contentLength);

          this.rawData = this.rawData.slice(this.contentLength);
          this.contentLength = -1;
          if (message.length > 0) {
            const response = JSON.parse(message) as Response;
            if (response.request_seq) {
              this.socket.emit("response", response);
            }
          }

          continue;
        }
      } else {
        const idx = this.rawData.indexOf(TWO_CRLF);
        if (idx !== -1) {
          const header = this.rawData.toString("utf8", 0, idx);
          const lines = header.split(HEADER_LINESEPARATOR);
          for (const h of lines) {
            const kvPair = h.split(HEADER_FIELDSEPARATOR);
            if (kvPair[0] === "Content-Length") {
              this.contentLength = Number(kvPair[1]);
            }
          }
          this.rawData = this.rawData.slice(idx + TWO_CRLF.length);
          continue;
        }
      }
      break;
    }
  }

  sequence = 1;

  private async call<T extends Response>(
    command: string,
    args?: { [key: string]: any },
    timeout = 0
  ) {
    const seq = this.sequence++;

    const request: Request = {
      command,
      type: "request",
      seq,
    };

    if (args && Object.keys(args).length > 0) {
      request.arguments = args;
    }

    return this.request<T>(request, timeout);
  }

  private async request<T extends Response>(request: Request, timeout: number) {
    const { command, seq } = request;
    const json = JSON.stringify(request);

    return new Promise<T>((res, rej) => {
      const err = new Error(`Then Call ${command} timed out.`);
      if (timeout) {
        setTimeout(() => rej(err), timeout * 1000);
      }
      const handResponse = (response: Response) => {
        if (response.command === command && response.request_seq === seq) {
          res(response as T);
        }
      };

      this.socket.on("response", handResponse);

      this.socket.write(
        `Content-Length: ${Buffer.byteLength(json, "utf8")}${TWO_CRLF}${json}`,
        "utf8"
      );
    });
  }

  private async connect(port: number, timeout = 0) {
    if (this.socket && this.socket.connecting) {
      return Promise.resolve();
    }

    this.socket = net.connect(port);

    return new Promise((res, rej) => {
      if (timeout) {
        setTimeout(() => rej(new Error("connect timeout")), timeout * 1000);
      }
      this.socket.once("connect", res);
      this.socket.once("error", rej);
      this.socket.once("close", rej);
      this.socket.on("data", (data) => {
        this.handleData(data);
      });
    });
  }
  async waitDebuggerStart(port: number) {
    await this.connect(port, 2);

    const result = await this.call("initialize", null, 2);

    assert(result.success);

    logger.debug("debugpy initialize", result);

    this.socket.end();
    this.socket = null;
  }
}
