declare module "json-rpc2" {
  import { Socket } from "net";
  export interface RPCConnection {
    call<T>(
      command: string,
      args: any[],
      callback: (err: Error, result: T) => void
    ): void;
    on(handler: "error", callback: (err: Error) => void): void;
    conn: Socket;
  }

  export class Client {
    static $create(port: number, addr: string): Client;
    connectSocket(callback: (err: Error, conn: RPCConnection) => void): void;
    on(handler: "error", callback: (err: Error) => void): void;
  }
}
