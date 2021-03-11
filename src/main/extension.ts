// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import NocalhostAppProvider from "./appProvider";
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
  TMP_DEVSTART_APPEND_COMMAND,
  TMP_ID,
  TMP_CONTAINER,
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
import { checkVersion } from "./ctl/nhctl";
import logger from "./utils/logger";
import * as fileUtil from "./utils/fileUtil";
import { KubernetesResourceFolder } from "./nodes/abstract/KubernetesResourceFolder";
import { NocalhostRootNode } from "./nodes/NocalhostRootNode";
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

  appTreeView.onDidExpandElement((e) => {
    const node = e.element;
    if (node instanceof KubernetesResourceFolder) {
      state.k8sFolderMap.set(node.getNodeStateId(), true);
    }
  });

  appTreeView.onDidCollapseElement((e) => {
    const node = e.element;
    if (node instanceof KubernetesResourceFolder) {
      state.k8sFolderMap.set(node.getNodeStateId(), false);
    }
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
  const jwt = host.getGlobalState(JWT);
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
  const tmpWorkloadPath = host.getGlobalState(TMP_WORKLOAD_PATH);
  console.log("currentUri: ", host.getCurrentRootPath());
  if (tmpWorkloadPath !== host.getCurrentRootPath()) {
    return;
  }
  console.log("launch devspace");
  const tmpApp = host.getGlobalState(TMP_APP);
  const tmpId = host.getGlobalState(TMP_ID);
  const tmpWorkload = host.getGlobalState(TMP_WORKLOAD);
  const tmpStatusId = host.getGlobalState(TMP_STATUS);
  const tmpResourceType = host.getGlobalState(TMP_RESOURCE_TYPE);
  const tmpKubeConfigPath = host.getGlobalState(TMP_KUBECONFIG_PATH);
  const tmpStorageClass = host.getGlobalState(TMP_STORAGE_CLASS);
  const tmpDevstartAppendCommand = host.getGlobalState(
    TMP_DEVSTART_APPEND_COMMAND
  );
  const tmpContainer = host.getGlobalState(TMP_CONTAINER);
  if (tmpApp && tmpWorkload && tmpStatusId && tmpResourceType) {
    host.removeGlobalState(TMP_APP);
    host.removeGlobalState(TMP_WORKLOAD);
    host.removeGlobalState(TMP_STATUS);
    host.removeGlobalState(TMP_RESOURCE_TYPE);
    host.removeGlobalState(TMP_KUBECONFIG_PATH);
    host.removeGlobalState(TMP_WORKLOAD_PATH);
    host.removeGlobalState(TMP_DEVSTART_APPEND_COMMAND);
    host.removeGlobalState(TMP_ID);
    host.removeGlobalState(TMP_CONTAINER);

    const node: ControllerNodeApi = {
      name: tmpWorkload,
      resourceType: tmpResourceType,
      setStatus: async (status: string): Promise<void> => {
        if (status) {
          await state.setAppState(tmpApp, `${tmpStatusId}`, status, {
            refresh: true,
            nodeStateId: tmpId,
          });
        } else {
          await state.deleteAppState(tmpApp, `${tmpStatusId}`, {
            refresh: true,
            nodeStateId: tmpId,
          });
        }
        return Promise.resolve();
      },
      getStatus: () => DeploymentStatus.developing,
      setContainer: async (container: string) => {
        if (container) {
          await state.setAppState(tmpApp, `${tmpId}_container`, container, {
            refresh: true,
            nodeStateId: tmpId,
          });
        } else {
          await state.deleteAppState(tmpApp, `${tmpId}_container`, {
            refresh: true,
            nodeStateId: tmpId,
          });
        }
        return Promise.resolve();
      },
      getContainer: () => Promise.resolve(tmpContainer),
      getKubeConfigPath: () => tmpKubeConfigPath,
      getAppName: () => tmpApp,
      getStorageClass: () => tmpStorageClass,
      getDevStartAppendCommand: () => tmpDevstartAppendCommand,
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
    host.getGlobalState(BASE_URL)
  );
}

async function init(context: vscode.ExtensionContext) {
  host.setContext(context);
  fileUtil.mkdir(NH_CONFIG_DIR);
  fileUtil.mkdir(PLUGIN_CONFIG_DIR);
  fileUtil.mkdir(KUBE_CONFIG_DIR);
  fileUtil.mkdir(HELM_VALUES_DIR);
  fileUtil.mkdir(HELM_NH_CONFIG_DIR);
  // fileStore.initConfig();
  host.setGlobalState("extensionPath", context.extensionPath);
  updateServerConfigStatus();
  checkVersion();

  const welcomeDidShow: boolean | undefined = host.getGlobalState(
    WELCOME_DID_SHOW
  );
  if (!welcomeDidShow) {
    NocalhostWebviewPanel.open({ url: "/welcome", title: "Welcome" });
    host.setGlobalState(WELCOME_DID_SHOW, true);
  }
}

process.on("uncaughtException", (error) => {
  logger.error(`[uncatch exception] ${error.message}`);
  vscode.window.showErrorMessage(error.message);
});

process.on("unhandledRejection", (error: any) => {
  logger.error(`[uncatch exception] ${(error && error.message) || error}`);
  vscode.window.showErrorMessage((error && error.message) || error);
});
