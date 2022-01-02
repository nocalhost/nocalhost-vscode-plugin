import * as vscode from "vscode";
import {
  CancellationToken,
  ExtensionTerminalOptions,
  Progress,
  QuickPickOptions,
} from "vscode";

export class Host implements vscode.Disposable {
  private outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel(
    "Nocalhost"
  );
  public statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );

  private devspaceDisposesMap = new Map<
    string,
    Map<
      string,
      Map<
        string,
        {
          dispose: () => any;
        }[]
      >
    >
  >();

  private context: vscode.ExtensionContext | null = null;

  public setContext(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public getContext() {
    return this.context;
  }

  public setGlobalState(key: string, state: any) {
    if (!this.context) {
      throw new Error("not initialized extension");
    }

    this.context.globalState.update(key, state);
  }

  public getGlobalState(key: string) {
    if (!this.context) {
      throw new Error("not initialized extension");
    }

    return this.context.globalState.get(key) as any;
  }

  public removeGlobalState(key: string) {
    if (!this.context) {
      throw new Error("not initialized extension");
    }

    return this.context.globalState.update(key, null);
  }

  public setWorkspaceState(key: string, state: any) {
    if (!this.context) {
      throw new Error("not initialized extension");
    }

    this.context.workspaceState.update(key, state);
  }

  public getWorkspaceState(key: string) {
    if (!this.context) {
      throw new Error("not initialized extension");
    }

    return this.context.workspaceState.get(key);
  }

  public removeWorkspaceState(key: string) {
    if (!this.context) {
      throw new Error("not initialized extension");
    }

    return this.context.workspaceState.update(key, null);
  }

  public disposeApp(devspaceName: string, id: string) {
    const appMap = this.devspaceDisposesMap.get(devspaceName);
    if (!appMap) {
      return;
    }
    const workloadMap = appMap.get(id);
    if (!workloadMap) {
      return;
    }

    workloadMap.forEach((arr, key) => {
      this.disposeWorkload(devspaceName, id, key);
    });

    workloadMap.clear();
    appMap.delete(id);
  }

  public disposeDevspace(devspaceName: string) {
    const appMap = this.devspaceDisposesMap.get(devspaceName);
    if (!appMap) {
      return;
    }

    appMap.forEach((m, key) => {
      this.disposeApp(devspaceName, key);
    });

    appMap.clear();
    this.devspaceDisposesMap.delete(devspaceName);
  }

  public disposeWorkload(devspaceName: string, appId: string, id: string) {
    const appMap = this.devspaceDisposesMap.get(devspaceName);
    if (!appMap) {
      return;
    }
    const workloadMap = appMap.get(appId);
    if (!workloadMap) {
      return;
    }
    const arr = workloadMap.get(id);
    if (!arr) {
      return;
    }

    arr.forEach((obj) => {
      obj.dispose();
    });

    workloadMap.delete(id);
  }

  public pushDispose(
    devspaceName: string,
    appId: string,
    id: string,
    obj: { dispose: () => any }
  ) {
    let appMap = this.devspaceDisposesMap.get(devspaceName);
    if (!appMap) {
      appMap = new Map();
      this.devspaceDisposesMap.set(devspaceName, appMap);
    }
    let workloadMap = appMap.get(appId);
    if (!workloadMap) {
      workloadMap = new Map();
      appMap.set(appId, workloadMap);
    }

    let arr = workloadMap.get(id);
    if (!arr) {
      arr = [];
      workloadMap.set(id, arr);
    }

    arr.push(obj);
  }

  public showInputBox(options: vscode.InputBoxOptions) {
    return vscode.window.showInputBox(options);
  }
  public showInputBoxIgnoreFocus(options: vscode.InputBoxOptions) {
    options.ignoreFocusOut = true;

    return this.showInputBox(options);
  }

  public withProgress<R>(
    options: Partial<vscode.ProgressOptions>,
    task: (
      progress: Progress<{ message?: string; increment?: number }>,
      token: vscode.CancellationToken
    ) => Thenable<R>
  ) {
    const location = vscode.ProgressLocation.Notification;
    const cancellable = false;

    return vscode.window.withProgress(
      { location, cancellable, ...options },
      task
    );
  }

  public showProgressing(
    title: string,
    task: (
      progress: Progress<{ message?: string; increment?: number }>
    ) => Thenable<unknown>
  ) {
    return vscode.window.withProgress(
      {
        title,
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
      },
      task
    );
  }

  showInformationMessage(
    msg: string,
    options?: vscode.MessageOptions,
    ...items: string[]
  ): Thenable<string | undefined> {
    if (options && options.modal) {
      return vscode.window.showInformationMessage(msg, options, ...items);
    }
    return new Promise((res, rej) => {
      setTimeout(() => {
        res(undefined);
      }, 4 * 1000);
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
  /**
   * Shows a selection list allowing multiple selections.
   *
   * @param items An array of strings, or a promise that resolves to an array of strings.
   * @param options Configures the behavior of the selection list.
   * @param token A token that can be used to signal cancellation.
   * @return A promise that resolves to the selected items or `undefined`.
   */
  async showQuickPick(
    items: readonly string[] | Thenable<readonly string[]>,
    options?: QuickPickOptions,
    token?: CancellationToken
  ): Promise<string | null> {
    const result = await vscode.window.showQuickPick(items, options, token);

    if (!result) {
      return Promise.reject();
    }
    return Promise.resolve(result);
  }

  showErrorMessage(msg: string, ...items: string[]) {
    return vscode.window.showErrorMessage(msg, ...items);
  }

  showWarnMessage(msg: string) {
    return vscode.window.showWarningMessage(msg);
  }

  showOpenDialog(options: vscode.OpenDialogOptions) {
    return vscode.window.showOpenDialog(options);
  }

  showSelectFolderDialog(title: string, defaultUri?: vscode.Uri) {
    return this.showOpenDialog({
      defaultUri: defaultUri,
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      title: title,
    });
  }

  showSelectFileDialog(title: string, defaultUri?: vscode.Uri) {
    return this.showOpenDialog({
      defaultUri: defaultUri,
      canSelectFolders: false,
      canSelectFiles: true,
      canSelectMany: false,
      title: title,
    });
  }

  copyTextToClipboard(text: string) {
    vscode.env.clipboard.writeText(text);
  }

  getOutputChannel() {
    return this.outputChannel;
  }

  createTerminal(
    options: (vscode.TerminalOptions | ExtensionTerminalOptions) & {
      iconPath?: { id: string };
    }
  ) {
    return vscode.window.createTerminal(options);
  }
  log(msg: string, line?: boolean) {
    if (line) {
      this.outputChannel.appendLine(msg);
    } else {
      this.outputChannel.append(msg);
    }
  }

  dispose() {
    this.statusBar.dispose();
    this.outputChannel.dispose();

    this.devspaceDisposesMap.forEach((m, key) => {
      this.disposeDevspace(key);
    });
    this.devspaceDisposesMap = new Map();
  }

  getCurrentRootPath() {
    return (
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0 &&
      vscode.workspace.workspaceFolders[0].uri.fsPath
    );
  }

  delay(time: number) {
    return new Promise<void>((res, rej) => {
      setTimeout(() => {
        res();
      }, time);
    });
  }

  isWindow() {
    return process.platform === "win32";
  }

  isLinux() {
    return process.platform !== "win32" && process.platform !== "darwin";
  }

  isMac() {
    return process.platform === "darwin";
  }

  async showWorkspaceFolderPick(): Promise<vscode.WorkspaceFolder | undefined> {
    if (!vscode.workspace.workspaceFolders) {
      vscode.window.showErrorMessage(
        "You need to open a folder before execute this command."
      );
      return undefined;
    } else if (vscode.workspace.workspaceFolders.length === 1) {
      return vscode.workspace.workspaceFolders[0];
    }
    return await vscode.window.showWorkspaceFolderPick();
  }

  formalizePath(path: string) {
    if (this.isWindow()) {
      return `"${path}"`;
    } else {
      return path.replace(/ /g, "\\ ");
    }
  }
}

export default new Host();
