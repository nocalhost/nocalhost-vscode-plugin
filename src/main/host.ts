import { open } from "fs";
import * as vscode from "vscode";
import { Progress } from "vscode";
import nocalhostState from "./state";

export class Host {
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

  public showProgressing(
    aciton: (
      progress: Progress<{ message?: string; increment?: number }>
    ) => Thenable<unknown>
  ) {
    return vscode.window.withProgress(
      {
        title: "Starting DevMode",
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
      },
      aciton
    );
  }

  showInformationMessage(
    msg: string,
    options?: vscode.MessageOptions,
    ...items: string[]
  ) {
    if (options && options.modal) {
      return vscode.window.showInformationMessage(msg, options, ...items);
    }
    return new Promise((res, rej) => {
      setTimeout(() => {
        res(undefined);
      }, 20 * 1000);
      if (options) {
        vscode.window.showInformationMessage(msg, options, ...items).then(
          (value) => {
            res(value);
          },
          (err) => rej(err)
        );
      } else {
        vscode.window.showInformationMessage(msg, ...items).then(
          (value) => {
            res(value);
          },
          (err) => rej(err)
        );
      }
    });
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

  invokeInNewTerminal(command: string, name?: string) {
    this.newTerminal = vscode.window.createTerminal(name);
    this.newTerminal.show();
    this.newTerminal.sendText(command);
    return this.newTerminal;
  }

  invokeInNewTerminalSpecialShell(
    commands: string[],
    shellPath: string,
    name: string
  ) {
    return vscode.window.createTerminal({
      name,
      shellArgs: commands,
      shellPath,
    });
  }

  log(msg: string, line?: boolean) {
    if (line) {
      this.outputChannel.appendLine(msg);
    } else {
      this.outputChannel.append(msg);
    }
  }

  dispose() {
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
