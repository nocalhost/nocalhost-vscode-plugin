// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import NocalhostAppProvider from "./appProvider";
import showLogin from "./commands/login";
import * as fileStore from "./store/fileStore";
import application from "./commands/application";
import {
  BASE_URL,
  JWT,
  KUBE_CONFIG_DIR,
  NH_CONFIG_DIR,
  SELECTED_APP_NAME,
} from "./constants";
import host from "./host";
import { clearInterval } from "timers";
import { showDashboard } from "./webviews";
import {
  AppFolderNode,
  BaseNocalhostNode,
  KubernetesResourceNode,
} from "./nodes/nodeType";
import nocalhostService from "./service/nocalhostService";
import NocalhostTextDocumentProvider from "./textDocumentProvider";
import * as shell from "shelljs";
import state from "./state";

export let appTreeView: vscode.TreeView<BaseNocalhostNode> | null | undefined;

let _refreshApp: NodeJS.Timeout;
export async function activate(context: vscode.ExtensionContext) {
  await init();

  let appTreeProvider = new NocalhostAppProvider();
  let nocalhostTextDocumentProvider = new NocalhostTextDocumentProvider();
  appTreeView = vscode.window.createTreeView("Nocalhost", {
    treeDataProvider: appTreeProvider,
  });

  appTreeView.onDidCollapseElement(
    (e: vscode.TreeViewExpansionEvent<BaseNocalhostNode>) => {
      const node = e.element;
      state.set(
        node.getNodeStateId(),
        vscode.TreeItemCollapsibleState.Collapsed
      );
    }
  );

  appTreeView.onDidExpandElement(
    async (e: vscode.TreeViewExpansionEvent<BaseNocalhostNode>) => {
      const node = e.element;
      state.set(
        node.getNodeStateId(),
        vscode.TreeItemCollapsibleState.Expanded
      );
      if (node instanceof AppFolderNode) {
        const others = (await node.getParent(node).getChildren()).filter(
          (item) => item.id !== node.id
        );
        others.map((item) =>
          state.set(
            item.getNodeStateId(),
            vscode.TreeItemCollapsibleState.Collapsed
          )
        );
        vscode.commands.executeCommand("useApplication", node);
      }
    }
  );
  let subs = [
    {
      dispose: appTreeView.dispose,
    },
    vscode.workspace.registerTextDocumentContentProvider(
      "Nocalhost",
      nocalhostTextDocumentProvider
    ),
    registerCommand("showDashboard", false, () => {
      showDashboard(context);
    }),

    registerCommand(
      "Nocalhost.startDevMode",
      true,
      async (node: KubernetesResourceNode) => {
        if (!node) {
          return;
        }
        // get app name
        const appName = fileStore.get(SELECTED_APP_NAME);
        if (!appName) {
          throw new Error("you must select one app");
        }
        await nocalhostService.startDevMode(
          host,
          appName,
          node.resourceType,
          node.name
        );
      }
    ),
    registerCommand(
      "Nocalhost.endDevMode",
      true,
      async (node: KubernetesResourceNode) => {
        // get app name
        const appName = fileStore.get(SELECTED_APP_NAME);
        await nocalhostService.endDevMode(host, appName, node.name);
      }
    ),
    registerCommand("Nocalhost.switchEndPoint", false, async () => {
      // switch endpoint
      const value: string = fileStore.get(BASE_URL);
      const options: vscode.InputBoxOptions = {
        placeHolder: "input your api server url",
        ...(value ? { value } : {}),
      };
      const newValue: string | undefined = await host.showInputBox(options);
      if (newValue) {
        fileStore.set(BASE_URL, newValue);
        host.showInformationMessage("configured api server");
        vscode.commands.executeCommand("refreshApplication");
      }
    }),

    registerCommand("Nocalhost.signout", false, () => {
      fileStore.remove(JWT);
      state.setLogin(false);
      appTreeProvider.refresh();
    }),
    registerCommand("Nocalhost.signin", false, showLogin),

    registerCommand("getApplicationList", false, () =>
      appTreeProvider.refresh()
    ),
    registerCommand("refreshApplication", false, () =>
      appTreeProvider.refresh()
    ),
    registerCommand(
      "Nocahost.installApp",
      true,
      async (appNode: AppFolderNode) => {
        state.set(`${appNode.label}_installing`, true);
        vscode.commands.executeCommand("refreshApplication");
        await nocalhostService
          .install(
            host,
            appNode.info.name,
            appNode.id,
            appNode.devSpaceId,
            appNode.info.url
          )
          .finally(() => {
            state.delete(`${appNode.label}_installing`);
            vscode.commands.executeCommand("refreshApplication");
          });
      }
    ),
    registerCommand(
      "Nocahost.uninstallApp",
      true,
      async (appNode: AppFolderNode) => {
        await nocalhostService.uninstall(
          host,
          appNode.info.name,
          appNode.id,
          appNode.devSpaceId
        );
      }
    ),
    registerCommand("useApplication", true, async (appNode: AppFolderNode) => {
      await application.useApplication(appNode);
    }),
    registerCommand(
      "Nocalhost.loadResource",
      false,
      async (node: KubernetesResourceNode | AppFolderNode) => {
        if (node instanceof KubernetesResourceNode) {
          const kind = node.resourceType;
          const name = node.name;
          const uri = vscode.Uri.parse(
            `Nocalhost://k8s/loadResource/${kind}/${name}.yaml`
          );
          let doc = await vscode.workspace.openTextDocument(uri);
          await vscode.window.showTextDocument(doc, { preview: false });
        } else if (node instanceof AppFolderNode) {
          const name = node.info.name;
          const uri = vscode.Uri.parse(`Nocalhost://nh/${name}.yaml`);
          let doc = await vscode.workspace.openTextDocument(uri);
          await vscode.window.showTextDocument(doc, { preview: false });
        }
      }
    ),
    registerCommand(
      "Nocalhost.log",
      false,
      async (node: KubernetesResourceNode) => {
        const kind = node.resourceType;
        const name = node.name;
        const appName = fileStore.get(SELECTED_APP_NAME);
        await nocalhostService.log(host, appName, kind, name);
      }
    ),
    registerCommand(
      "Nocalhost.portForward",
      false,
      async (node: KubernetesResourceNode) => {
        const kind = node.resourceType;
        const name = node.name;
        await nocalhostService.portForward(host, kind, name);
      }
    ),
    registerCommand(
      "Nocalhost.exec",
      true,
      async (node: KubernetesResourceNode) => {
        const appName = fileStore.get(SELECTED_APP_NAME);
        await nocalhostService.exec(
          host,
          appName,
          node.resourceType,
          node.name
        );
      }
    ),
  ];

  context.subscriptions.push(...subs);
  _refreshApp = host.timer("refreshApplication", []);
  vscode.commands.executeCommand("showDashboard");
  const jwt = fileStore.get(JWT);
  if (jwt) {
    state.setLogin(true);
  }
  host.getOutputChannel().show(true);
}

function registerCommand(command: string, isLock: boolean, callback: any) {
  checkCtl("nhctl");
  checkCtl("kubectl");
  checkCtl("git");
  checkCtl("mutagen");
  const dispose = vscode.commands.registerCommand(
    command,
    async (...args: any[]) => {
      if (isLock) {
        if (state.isRunning()) {
          host.showWarnMessage("A task is running, please try again later");
          return;
        }
        state.setRunning(true);
        Promise.resolve(callback(...args))
          .catch((err) => {
            const errMessage =
              (err.message ? err.message : err) || "internal error";
            host.showErrorMessage(errMessage);
          })
          .finally(() => {
            state.setRunning(false);
          });
      } else {
        if (callback.then) {
          callback(...args).catch((err: any) => {
            const errMessage =
              (err.message ? err.message : err) || "internal error";
            host.showErrorMessage(errMessage);
          });
        } else {
          callback(...args);
        }
      }
    }
  );

  return dispose;
}

export function deactivate() {
  clearInterval(_refreshApp);
}

export function checkCtl(name: string) {
  const res = shell.which(name);
  if (res && res.code === 0) {
    return true;
  }
  throw new Error(`not found ${name}`);
}

async function init() {
  fileStore.mkdir(NH_CONFIG_DIR);
  fileStore.mkdir(KUBE_CONFIG_DIR);
  fileStore.initConfig();
}
