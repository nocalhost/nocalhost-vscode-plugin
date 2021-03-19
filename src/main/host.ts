import * as vscode from "vscode";
import { Progress } from "vscode";
import * as shell from "./ctl/shell";
import { NOCALHOST_INSTALLATION_LINK } from "./constants";
import { checkVersion } from "./ctl/nhctl";
import { KubernetesResourceFolder } from "./nodes/abstract/KubernetesResourceFolder";
import { NocalhostRootNode } from "./nodes/NocalhostRootNode";
import state from "./state";
export class Host implements vscode.Disposable {
  private outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel(
    "Nocalhost"
  );
  public outSyncStatusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    101
  );
  public statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  private newTerminal!: vscode.Terminal | null;

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

  // TODO: DELETE
  private bookInfoDisposes: Array<{ dispose: () => any }> = [];

  private context: vscode.ExtensionContext | null = null;

  public setContext(context: vscode.ExtensionContext) {
    this.context = context;
  }

  private autoRefreshTimeId: NodeJS.Timeout | null = null;

  public stopAutoRefresh() {
    if (this.autoRefreshTimeId) {
      clearInterval(this.autoRefreshTimeId);
      this.autoRefreshTimeId = null;
    }
  }

  public startAutoRefresh() {
    if (this.autoRefreshTimeId) {
      clearInterval(this.autoRefreshTimeId);
      this.autoRefreshTimeId = null;
    }

    this.autoRefreshTimeId = setInterval(async () => {
      const rootNode = state.getNode("Nocalhost") as NocalhostRootNode;
      if (rootNode) {
        await rootNode.updateData();
      }
      for (const [id, expanded] of state.k8sFolderMap) {
        if (expanded) {
          const node = state.getNode(id) as KubernetesResourceFolder;
          if (node) {
            // filter parent is close
            // function isClose(parentNode: BaseNocalhostNode): boolean {
            //   const child = parentNode.getParent();
            //   if (!child) {
            //     return false;
            //   }
            //   if (child instanceof NocalhostFolderNode && !child.isExpand) {
            //     return true;
            //   }

            //   return isClose(child);
            // }
            // const close = isClose(node);
            await node.updateData().catch(() => {});
            // if (!close) {
            //   await node.updateData();
            // }
          }
        }
      }
    }, 5 * 1000);
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

  public pushBookInfoDispose(item: { dispose: () => any }) {
    this.bookInfoDisposes.push(item);
  }

  public disposeBookInfo() {
    this.bookInfoDisposes.map((item) => {
      if (item) {
        item.dispose();
      }
    });

    this.bookInfoDisposes = [];
  }

  public showInputBox(options: vscode.InputBoxOptions) {
    return vscode.window.showInputBox(options);
  }

  public showProgressing(
    title: string,
    aciton: (
      progress: Progress<{ message?: string; increment?: number }>
    ) => Thenable<unknown>
  ) {
    return vscode.window.withProgress(
      {
        title,
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

  copyTextToclipboard(text: string) {
    vscode.env.clipboard.writeText(text);
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
    this.statusBar.dispose();
    this.outputChannel.dispose();
    this.disposeBookInfo();
    if (this.newTerminal) {
      this.newTerminal.dispose();
    }

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

  formalizePath(path: string) {
    if (this.isWindow()) {
      return `"${path}"`;
    } else {
      return path.replace(/ /g, "\\ ");
    }
  }

  async check() {
    const tools = ["kubectl", "nhctl"];
    for (let i = 0; i < tools.length; i++) {
      const exist = shell.which(tools[i]);
      if (!exist) {
        switch (tools[i]) {
          case "kubectl": {
            vscode.window.showErrorMessage(
              "kubectl not found, please install kubectl first."
            );
            break;
          }
          case "nhctl": {
            const result:
              | string
              | undefined = await vscode.window.showErrorMessage(
              "nhctl not found, please install nhctl first.",
              "Get nhctl"
            );
            if (result === "Get nhctl") {
              vscode.env.openExternal(
                vscode.Uri.parse(NOCALHOST_INSTALLATION_LINK)
              );
            }
            break;
          }
        }
      }
    }
    checkVersion();
  }
}

export default new Host();
