// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import NocalhostAppProvider from "./appProvider";
import * as fileStore from "./store/fileStore";
import {
  BASE_URL,
  HELM_VALUES_DIR,
  JWT,
  KUBE_CONFIG_DIR,
  HELM_NH_CONFIG_DIR,
  NH_CONFIG_DIR,
  PLUGIN_CONFIG_DIR,
  TMP_APP,
  TMP_KUBECONFIG_PATH,
  TMP_RESOURCE_TYPE,
  TMP_STATUS,
  TMP_STORAGE_CLASS,
  TMP_WORKLOAD,
  WELCOME_DID_SHOW,
  TMP_WORKLOAD_PATH,
} from "./constants";
import host from "./host";
import NocalhostFileSystemProvider from "./fileSystemProvider";
import * as shell from "shelljs";
import state from "./state";
import { START_DEV_MODE } from "./commands/constants";
import initCommands from "./commands";
import { ControllerNodeApi } from "./commands/StartDevModeCommand";
import { BaseNocalhostNode, DeploymentStatus } from "./nodes/types/nodeType";
import NocalhostWebviewPanel from "./webview/NocalhostWebviewPanel";
import TextDocumentContentProvider from "./textDocumentContentProvider";
// import DataCenter from "./common/DataCenter/index";

export let appTreeView: vscode.TreeView<BaseNocalhostNode> | null | undefined;

export async function activate(context: vscode.ExtensionContext) {
  await init(context);
  let appTreeProvider = new NocalhostAppProvider();
  initCommands(context, appTreeProvider);

  // TODO: DO NOT DELETE, FOR: [webview integration]
  // const dataCenter: DataCenter = DataCenter.getInstance();
  // dataCenter.addListener(() => appTreeProvider.refresh());

  let nocalhostFileSystemProvider = new NocalhostFileSystemProvider();
  appTreeView = vscode.window.createTreeView("Nocalhost", {
    treeDataProvider: appTreeProvider,
  });

  const textDocumentContentProvider = TextDocumentContentProvider.getInstance();

  let subs = [
    host,
    {
      dispose: appTreeView.dispose,
    },
    vscode.workspace.registerFileSystemProvider(
      "Nocalhost",
      nocalhostFileSystemProvider,
      { isReadonly: true }
    ),
    vscode.workspace.registerFileSystemProvider(
      "NocalhostRW",
      nocalhostFileSystemProvider
    ),
    vscode.workspace.registerTextDocumentContentProvider(
      "nhtext",
      textDocumentContentProvider
    ),
    vscode.window.onDidChangeWindowState((e) => {
      if (e.focused) {
        launchDevspace();
      }
    }),
  ];

  context.subscriptions.push(...subs);
  const jwt = fileStore.get(JWT);
  if (jwt) {
    state.setLogin(true);
  }
  host.getOutputChannel().show(true);
  await vscode.commands.executeCommand(
    "setContext",
    "extensionActivated",
    true
  );

  launchDevspace();
}

function launchDevspace() {
  const tmpWorkloadPath = fileStore.get(TMP_WORKLOAD_PATH);
  console.log("currentUri: ", host.getCurrentRootPath());
  if (tmpWorkloadPath !== host.getCurrentRootPath()) {
    return;
  }
  console.log("launch devspace");
  const tmpApp = fileStore.get(TMP_APP);
  const tmpWorkload = fileStore.get(TMP_WORKLOAD);
  const tmpStatusId = fileStore.get(TMP_STATUS);
  const tmpResourceType = fileStore.get(TMP_RESOURCE_TYPE);
  const tmpKubeConfigPath = fileStore.get(TMP_KUBECONFIG_PATH);
  const tmpStorageClass = fileStore.get(TMP_STORAGE_CLASS);
  if (tmpApp && tmpWorkload && tmpStatusId && tmpResourceType) {
    fileStore.remove(TMP_APP);
    fileStore.remove(TMP_WORKLOAD);
    fileStore.remove(TMP_STATUS);
    fileStore.remove(TMP_RESOURCE_TYPE);
    fileStore.remove(TMP_KUBECONFIG_PATH);
    fileStore.remove(TMP_WORKLOAD_PATH);

    const node: ControllerNodeApi = {
      name: tmpWorkload,
      resourceType: tmpResourceType,
      setStatus: async (status: string): Promise<void> => {
        if (status) {
          await state.setAppState(tmpApp, `${tmpStatusId}`, status, {
            refresh: true,
            nodeStateId: tmpStatusId,
          });
        } else {
          await state.deleteAppState(tmpApp, `${tmpStatusId}`, {
            refresh: true,
            nodeStateId: tmpStatusId,
          });
        }
        return Promise.resolve();
      },
      getStatus: () => DeploymentStatus.developing,
      getKubeConfigPath: () => tmpKubeConfigPath,
      getAppName: () => tmpApp,
      getStorageClass: () => tmpStorageClass,
    };
    vscode.commands.executeCommand(START_DEV_MODE, node);
  }
}

export function deactivate() {
  host.dispose();
}

export function checkCtl(name: string) {
  const res = shell.which(name);
  if (res && res.code === 0) {
    return true;
  }
  throw new Error(`not found ${name}`);
}

export async function updateServerConfigStatus() {
  await vscode.commands.executeCommand(
    "setContext",
    "serverConfig",
    fileStore.get(BASE_URL)
  );
}

async function init(context: vscode.ExtensionContext) {
  fileStore.mkdir(NH_CONFIG_DIR);
  fileStore.mkdir(PLUGIN_CONFIG_DIR);
  fileStore.mkdir(KUBE_CONFIG_DIR);
  fileStore.mkdir(HELM_VALUES_DIR);
  fileStore.mkdir(HELM_NH_CONFIG_DIR);
  fileStore.initConfig();
  fileStore.set("extensionPath", context.extensionPath);
  updateServerConfigStatus();

  const welcomeDidShow: boolean | undefined = fileStore.get(WELCOME_DID_SHOW);
  if (!welcomeDidShow) {
    NocalhostWebviewPanel.open({ url: "/welcome", title: "Welcome" });
    fileStore.set(WELCOME_DID_SHOW, true);
  }
}

process.on("uncaughtException", (error) => {
  vscode.window.showErrorMessage(error.message);
});

process.on("unhandledRejection", (error: any) => {
  vscode.window.showErrorMessage((error && error.message) || error);
});
