import * as net from "net";
import * as vscode from "vscode";

const TWO_CRLF = "\r\n\r\n";

const HEADER_LINESEPARATOR = /\r?\n/; // allow for non-RFC 2822 conforming line separators
const HEADER_FIELDSEPARATOR = /: */;

interface ProtocolMessage {
  /** Sequence number (also known as message ID). For protocol messages of type 'request' this ID can be used to cancel the request. */
  seq: number;
  /** Message type.
    Values: 'request', 'response', 'event', etc.
  */
  type: "request" | "response" | "event";
}

/** A client or debug adapter initiated request. */
class Request implements ProtocolMessage {
  type: ProtocolMessage["type"] = "request";
  constructor(
    public seq: number,
    /** The command to execute. */
    public command: string,
    /** Object containing arguments for the command. */
    public argument?: any
  ) {
    if (argument && Object.keys(argument).length > 0) {
      this.arguments = argument;
    }
  }
  arguments?: any;
}

/** A debug adapter initiated event. */
class Event implements ProtocolMessage {
  type: ProtocolMessage["type"] = "event";
  constructor(
    public seq: number,
    /**
     * Type of event.
     */
    public event: string,
    /**
     * Event-specific information.
     */
    public body?: any
  ) {}
}

/** Response for a request. */
interface Response extends ProtocolMessage {
  // type: 'response';
  /** Sequence number of the corresponding request. */
  request_seq: number;
  /** Outcome of the request.
    If true, the request was successful and the 'body' attribute may contain the result of the request.
    If the value is false, the attribute 'message' contains the error in short form and the 'body' may contain additional information (see 'ErrorResponse.body.error').
  */
  success: boolean;
  /** The command requested. */
  command: string;
  /** Contains the raw error in short form if 'success' is false.
    This raw error might be interpreted by the frontend and is not shown in the UI.
    Some predefined values exist.
    Values: 
    'cancelled': request was cancelled.
    etc.
  */
  message?: "cancelled" | string;
  /** Contains request result if success is true and optional error details if success is false. */
  body?: any;
}
export class SocketDebugClient {
  protected socket?: net.Socket;
  private rawData = Buffer.allocUnsafe(0);
  private contentLength = -1;

  constructor(private port: number, private sequence: number = 1) {
    this.rawData = Buffer.allocUnsafe(0);
    this.contentLength = -1;
  }

  protected readonly _onError = new vscode.EventEmitter<Error>();

  async request<T extends Response>(
    command: string,
    args?: { [key: string]: any },
    timeout = 0
  ) {
    const request = new Request(this.sequence++, command, args);

    return this.call<T>(request, timeout);
  }
  async event<T extends Response>(event: string, body?: any, timeout = 0) {
    return this.call<T>(new Event(this.sequence++, event, body), timeout);
  }
  private async call<T extends Response>(
    request: Request | Event,
    timeout: number
  ) {
    const { seq } = request;
    const json = JSON.stringify(request);
    const command =
      request instanceof Request ? request.command : request.event;

    return new Promise<T>((res, rej) => {
      const err = new Error(`Then Call ${command} timed out.`);
      if (timeout) {
        setTimeout(() => rej(err), timeout * 1000);
      }
      const handResponse = (response: Response) => {
        if (response.request_seq === seq) {
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

  connect(timeout: number = 0): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (timeout > 0) {
        setTimeout(() => reject(new Error("timeout")), timeout * 100);
      }

      let connected = false;

      this.socket = net.createConnection(this.port, "127.0.0.1", () => {
        resolve();
        connected = true;
      });

      this.socket.on("data", (data: Buffer) => this.handleData(data));

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
}
