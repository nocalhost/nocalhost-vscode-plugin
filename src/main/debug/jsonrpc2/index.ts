import * as net from "net";
const JsonParser = require("jsonparse");

class Client {
  socket: net.Socket;
  parser: any;
  constructor(private port: number, private host: string = "127.0.0.1") {}
  static create(port: number) {
    return new Client(port);
  }
  connectSocket() {
    this.socket = net.connect(this.port, this.host, () => {
      this.binEvent();

      this.parser = new JsonParser();

      this.parser.onValue = function parseOnValue(decoded: any) {};
    });
  }

  call<T>(command: string, args: any[]): T {
    return null;
  }

  private binEvent() {
    this.socket.once("error", function socketError(event) {});

    this.socket.once("open", function socketOpen() {});

    this.socket.on("message", (event) => {
      try {
        this.parser.write(event.data);
      } catch (err) {}
    });

    this.socket.on("end", function socketEnd() {});

    this.socket.on("close", function socketClose(hadError) {});
  }
}
