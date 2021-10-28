import { DebugConfiguration } from "vscode";
import { IDebugProvider } from "./IDebugProvider";

export class RubyDebugProvider extends IDebugProvider {
  name: string = "ruby";
  requireExtensions: string[] = ["rebornix.Ruby"];

  getDebugConfiguration(
    name: string,
    port: number,
    remoteRoot: string
  ): DebugConfiguration {
    // https://github.com/rubyide/vscode-ruby/wiki/2.-Launching-from-VS-Code

    return {
      name,
      type: "Ruby",
      request: "attach",
      remoteWorkspaceRoot: "${workspaceRoot}",
      remoteHost: "localhost",
      remotePort: port,
    };
  }
}
