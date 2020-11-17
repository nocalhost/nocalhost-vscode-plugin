import * as vscode from 'vscode';
import nocalhostState from './state';

export class Host {
  private terminal = vscode.window.createTerminal('nhctl');
  private outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('nhctl');
  private newTerminal!: vscode.Terminal | null;
  getOutputChannel() {
    return this.outputChannel;
  }

  invokeInTerminal(command: string) {
    this.terminal.show();
    return this.terminal.sendText(command);
  }

  invokeInNewTerminal(command: string, name?: string, replace?: boolean) {
    // let terminal;
    // if (replace) {
      
    // }
    this.newTerminal = vscode.window.createTerminal(name);
    this.newTerminal.show();
    this.newTerminal.sendText(command);
  }

  log(msg: string, line?: boolean) {
    if (line) {
      this.outputChannel.appendLine(msg);
    } else {
      this.outputChannel.append(msg);
    }
    this.outputChannel.show();
  }

  dispose() {
    this.terminal.dispose();
    this.outputChannel.dispose();
  }

  timer(command: string, args: [],  timeDuring?: number) {
    return setInterval(() => {
      const islogin = nocalhostState.isLogin();
      if (islogin) {
        vscode.commands.executeCommand(command, ...args);
      }
    }, timeDuring || 5000);
  }
}

export default new Host();