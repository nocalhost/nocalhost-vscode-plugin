import * as net from "net";
import * as stream from "stream";
import * as vscode from "vscode";

const TWO_CRLF = "\r\n\r\n";

const HEADER_LINESEPARATOR = /\r?\n/; // allow for non-RFC 2822 conforming line separators
const HEADER_FIELDSEPARATOR = /: */;

export class SocketDebugAdapter {
  port: number;
  protected socket?: net.Socket;
  private sequence: number;

  constructor(port: number) {
    this.port = port;
    this.sequence = 1;
  }

  private outputStream!: stream.Writable;
  private rawData = Buffer.allocUnsafe(0);
  private contentLength = -1;

  protected readonly _onError = new vscode.EventEmitter<Error>();
  protected connect(
    readable: stream.Readable,
    writable: stream.Writable
  ): void {
    this.outputStream = writable;
    this.rawData = Buffer.allocUnsafe(0);
    this.contentLength = -1;

    readable.on("data", (data: Buffer) => this.handleData(data));
  }

  public async start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let connected = false;

      this.socket = this.createConnection(() => {
        this.connect(this.socket!, this.socket!);
        resolve();
        connected = true;
      });

      this.socket.on("close", () => {
        if (connected) {
          this._onError.fire(new Error("connection closed"));
        } else {
          reject(new Error("connection closed"));
        }
      });

      this.socket.on("error", (error) => {
        if (connected) {
          this._onError.fire(error);
        } else {
          reject(error);
        }
      });
    });
  }
  sendRequest(
    command: string,
    args: any,
    clb: (result: unknown) => void,
    timeout?: number
  ): number {
    const request: any = {
      command: command,
    };
    if (args && Object.keys(args).length > 0) {
      request.arguments = args;
    }
    this.internalSend("request", request);

    if (clb) {
    }

    return request.seq;
  }
  private internalSend(
    typ: "request" | "response" | "event",
    message: any
  ): void {
    message.type = typ;
    message.seq = this.sequence++;
    this.sendMessage(message);
  }
  private handleData(data: Buffer): void {
    this.rawData = Buffer.concat([this.rawData, data]);

    while (true) {
      if (this.contentLength >= 0) {
        if (this.rawData.length >= this.contentLength) {
          const message = this.rawData.toString("utf8", 0, this.contentLength);
          this.rawData = this.rawData.slice(this.contentLength);
          this.contentLength = -1;
          if (message.length > 0) {
            try {
            } catch (e) {}
          }
          continue; // there may be more complete messages to process
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
  sendMessage(message: any): void {
    if (this.outputStream) {
      const json = JSON.stringify(message);
      this.outputStream.write(
        `Content-Length: ${Buffer.byteLength(json, "utf8")}${TWO_CRLF}${json}`,
        "utf8"
      );
    }
  }
  protected createConnection(connectionListener: () => void): net.Socket {
    return net.createConnection(this.port, "127.0.0.1", connectionListener);
  }
}
