import { open } from "fs";
import * as vscode from "vscode";
import nocalhostState from "./state";

export class Host {
  private terminal = vscode.window.createTerminal("Nocalhost");
  private outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel(
    "Nocalhost"
  );
  private newTerminal!: vscode.Terminal | null;
  private debugDisposes: Array<{ dispose: () => any }> = [];

  public pushDebugDispose(item: { dispose: () => any }) {
    this.debugDisposes.push(item);
  }

  public disposeDebug() {
    this.debugDisposes.map((item) => {
      if (item) {
        item.dispose();
      }
    });
  }

  public showInputBox(options: vscode.InputBoxOptions) {
    return vscode.window.showInputBox(options);
  }

  showInformationMessage(
    msg: string,
    options?: vscode.MessageOptions,
    ...items: string[]
  ) {
    return vscode.window.showInformationMessage(msg, options, ...items);
  }

  showErrorMessage(msg: string) {
    return vscode.window.showErrorMessage(msg);
  }

  showWarnMessage(msg: string) {
    return vscode.window.showWarningMessage(msg);
  }

  showOpenDialog(options: vscode.OpenDialogOptions) {
    return vscode.window.showOpenDialog(options);
  }

  showSelectFolderDialog(title: string) {
    return this.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      title: title,
    });
  }

  getOutputChannel() {
    return this.outputChannel;
  }

  invokeInTerminal(command: string) {
    this.terminal.show();
    return this.terminal.sendText(command);
  }

  invokeInNewTerminal(command: string, name?: string, replace?: boolean) {
    this.newTerminal = vscode.window.createTerminal(name);
    this.newTerminal.show();
    this.newTerminal.sendText(command);

    return this.newTerminal;
  }

  log(msg: string, line?: boolean) {
    if (line) {
      this.outputChannel.appendLine(msg);
    } else {
      this.outputChannel.append(msg);
    }
  }

  dispose() {
    this.terminal.dispose();
    this.outputChannel.dispose();
  }

  timer(command: string, args: [], timeDuring?: number) {
    return setInterval(() => {
      const islogin = nocalhostState.isLogin();
      if (islogin) {
        vscode.commands.executeCommand(command, ...args);
      }
    }, timeDuring || 5000);
  }
}

export default new Host();
