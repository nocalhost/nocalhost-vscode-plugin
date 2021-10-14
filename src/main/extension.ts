import * as vscode from "vscode";

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import NocalhostAppProvider from "./appProvider";
import {
  PLUGIN_TEMP_DIR,
  TMP_DEV_START_IMAGE,
  BASE_URL,
  HELM_VALUES_DIR,
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
  TMP_MODE,
  TMP_DEVSPACE,
  TMP_NAMESPACE,
  NH_BIN,
  TMP_DEV_START_COMMAND,
} from "./constants";
import host from "./host";
import NocalhostFileSystemProvider from "./fileSystemProvider";
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
import { NocalhostFolderNode } from "./nodes/abstract/NocalhostFolderNode";
// import { registerYamlSchemaSupport } from "./yaml/yamlSchema";
import messageBus from "./utils/messageBus";
import LocalClusterService from "./clusters/LocalCuster";
import { DevSpaceNode } from "./nodes/DevSpaceNode";
import { HomeWebViewProvider } from "./webview/HomePage";
import { isExistCluster } from "./clusters/utils";
import { unlock } from "./utils/download";
// import DataCenter from "./common/DataCenter/index";
import * as nls from "vscode-nls";
import SyncServiceCommand from "./commands/SyncServiceCommand";
import { ShellExecError } from "./ctl/shell";

// The example uses the file message format.
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

export let appTreeView: vscode.TreeView<BaseNocalhostNode> | null | undefined;

export async function activate(context: vscode.ExtensionContext) {
  await init(context);
  let appTreeProvider = new NocalhostAppProvider();
  initCommands(context, appTreeProvider);

  // TODO: DO NOT DELETE, FOR: [webview integration]
  // const dataCenter: DataCenter = DataCenter.getInstance();
  // dataCenter.addListener(() => appTreeProvider.refresh());
  let homeWebViewProvider = new HomeWebViewProvider(
    context.extensionUri,
    appTreeProvider
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      HomeWebViewProvider.viewType,
      homeWebViewProvider
    )
  );

  let nocalhostFileSystemProvider = new NocalhostFileSystemProvider();
  appTreeView = vscode.window.createTreeView("Nocalhost", {
    treeDataProvider: appTreeProvider,
  });

  appTreeView.onDidExpandElement((e) => {
    const node = e.element;
    if (
      node instanceof KubernetesResourceFolder ||
      node instanceof DevSpaceNode
    ) {
      state.refreshFolderMap.set(node.getNodeStateId(), true);
    }

    if (node instanceof NocalhostFolderNode) {
      node.isExpand = true;
    }
  });

  appTreeView.onDidCollapseElement((e) => {
    const node = e.element;
    if (
      node instanceof KubernetesResourceFolder ||
      node instanceof DevSpaceNode
    ) {
      state.refreshFolderMap.set(node.getNodeStateId(), false);
    }
    if (node instanceof NocalhostFolderNode) {
      node.isExpand = false;
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
  ];

  context.subscriptions.push(...subs);

  host.getOutputChannel().show(true);
  // await registerYamlSchemaSupport();

  messageBus.on("devstart", (value) => {
    if (value.source !== (host.getCurrentRootPath() || "")) {
      host.disposeBookInfo();
      launchDevspace();
    }
  });

  messageBus.on("endDevMode", (value) => {
    if (value.source !== (host.getCurrentRootPath() || "")) {
      const data = value.value as {
        devspaceName: string;
        appName: string;
        workloadName: string;
      };
      host.disposeWorkload(data.devspaceName, data.appName, data.workloadName);
    }
  });

  messageBus.on("uninstall", (value) => {
    if (value.source !== (host.getCurrentRootPath() || "")) {
      const data = value.value as {
        devspaceName: string;
        appName: string;
      };
      host.disposeApp(data.devspaceName, data.appName);
    }
  });
  messageBus.on("install", (value) => {
    try {
      const data = value.value as {
        status: string;
      };
      if (data.status === "loading") {
        host.stopAutoRefresh();
        SyncServiceCommand.stopSyncStatus();
      } else {
        host.startAutoRefresh();
        SyncServiceCommand.checkSync();
      }
    } catch (error) {
      host.log(`MessageBus install: ${error}`, true);
    }
  });
  await vscode.commands.executeCommand(
    "setContext",
    "extensionActivated",
    true
  );
  if (isExistCluster()) {
    await state.refreshTree();
  } else {
    await vscode.commands.executeCommand("setContext", "emptyCluster", true);
  }
  launchDevspace();
}

function launchDevspace() {
  SyncServiceCommand.checkSync();

  const tmpWorkloadPath = host.getGlobalState(TMP_WORKLOAD_PATH);

  if (tmpWorkloadPath !== host.getCurrentRootPath()) {
    return;
  }

  const tmpDevspace = host.getGlobalState(TMP_DEVSPACE);
  const tmpNamespace = host.getGlobalState(TMP_NAMESPACE);
  const tmpApp = host.getGlobalState(TMP_APP);
  const tmpId = host.getGlobalState(TMP_ID);
  const tmpWorkload = host.getGlobalState(TMP_WORKLOAD);
  const tmpStatusId = host.getGlobalState(TMP_STATUS);
  const tmpResourceType = host.getGlobalState(TMP_RESOURCE_TYPE);
  const tmpKubeConfigPath = host.getGlobalState(TMP_KUBECONFIG_PATH);
  const tmpStorageClass = host.getGlobalState(TMP_STORAGE_CLASS);
  const tmpCommand = host.getGlobalState(TMP_DEV_START_COMMAND);

  const tmpDevstartAppendCommand = host.getGlobalState(
    TMP_DEVSTART_APPEND_COMMAND
  );
  const tmpContainer = host.getGlobalState(TMP_CONTAINER);
  const tmpMode = host.getGlobalState(TMP_MODE);
  const tmpImage = host.getGlobalState(TMP_DEV_START_IMAGE);

  if (tmpApp && tmpWorkload && tmpStatusId && tmpResourceType) {
    host.removeGlobalState(TMP_DEVSPACE);
    host.removeGlobalState(TMP_NAMESPACE);
    host.removeGlobalState(TMP_APP);
    host.removeGlobalState(TMP_WORKLOAD);
    host.removeGlobalState(TMP_STATUS);
    host.removeGlobalState(TMP_RESOURCE_TYPE);
    host.removeGlobalState(TMP_KUBECONFIG_PATH);
    host.removeGlobalState(TMP_WORKLOAD_PATH);
    host.removeGlobalState(TMP_DEVSTART_APPEND_COMMAND);
    host.removeGlobalState(TMP_ID);
    host.removeGlobalState(TMP_CONTAINER);
    host.removeGlobalState(TMP_STORAGE_CLASS);
    host.removeGlobalState(TMP_DEV_START_COMMAND);

    const node: ControllerNodeApi = {
      name: tmpWorkload,
      resourceType: tmpResourceType,
      getParent: () => null,
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
      getSpaceName: () => tmpDevspace,
      getNameSpace: () => tmpNamespace,
    };

    vscode.commands.executeCommand(START_DEV_MODE, node, {
      mode: tmpMode,
      image: tmpImage,
      command: tmpCommand,
    });
  }
}

export async function deactivate() {
  await unlock(() => {});
  host.dispose();
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
  fileUtil.mkdir(PLUGIN_TEMP_DIR);
  fileUtil.mkdir(KUBE_CONFIG_DIR);
  fileUtil.mkdir(HELM_VALUES_DIR);
  fileUtil.mkdir(HELM_NH_CONFIG_DIR);
  fileUtil.mkdir(NH_BIN);
  // fileStore.initConfig();
  host.setGlobalState("extensionPath", context.extensionPath);
  updateServerConfigStatus();
  await messageBus.init();
  await checkVersion();
  LocalClusterService.verifyLocalCluster();

  const welcomeDidShow: boolean | undefined = host.getGlobalState(
    WELCOME_DID_SHOW
  );
  if (!welcomeDidShow) {
    NocalhostWebviewPanel.open({ url: "/welcome", title: "Welcome" });
    host.setGlobalState(WELCOME_DID_SHOW, true);
  }
}

process.on("exit", function (code) {
  unlock(() => {});
  logger.error("exit vscode process" + code);
});

process.on("disconnect", function () {
  unlock(() => {});
  logger.error("exit vscode process");
});
process.on("uncaughtException", (error) => {
  logger.error(`[uncaught exception] ${error.message} ${error.stack}`);
  if (error.message === "read ENOTCONN") {
    return;
  }
  if (
    error.message.includes("routines:OPENSSL_internal:WRONG_VERSION_NUMBER")
  ) {
    return;
  }
  vscode.window.showErrorMessage(error.message);
});

process.on("unhandledRejection", (error?: string | Error | any) => {
  if (error === undefined) {
    return;
  }

  function isIgnoreError(message: string) {
    if (
      message &&
      (message === "read ENOTCONN" ||
        message.includes("routines:OPENSSL_internal:WRONG_VERSION_NUMBER"))
    ) {
      return true;
    }
  }

  if (error instanceof Error || error instanceof ShellExecError) {
    if (
      !process.argv.includes("--type=extensionHost") &&
      error.stack &&
      !error.stack.includes("nocalhost.nocalhost")
    ) {
      return;
    }

    const { message } = error;

    if (!isIgnoreError(message)) {
      vscode.window.showErrorMessage(message);
    }
  } else if (error.source === "api" && error.error && error.error.code) {
    const { message } = error.error;

    if (message && !isIgnoreError(message)) {
      vscode.window.showErrorMessage(message);
    }
  }

  logger.error(`[unhandledRejection]`, error);
});
