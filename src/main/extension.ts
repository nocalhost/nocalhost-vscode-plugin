import { PLUGIN_TEMP_DIR } from "./constants";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import NocalhostAppProvider from "./appProvider";
import {
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
  TMP_DEVSPACE,
  TMP_NAMESPACE,
  NH_BIN,
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

  await messageBus.init();

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
      host.log(`${error}, +++++`, true);
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
  const tmpDevstartAppendCommand = host.getGlobalState(
    TMP_DEVSTART_APPEND_COMMAND
  );
  const tmpContainer = host.getGlobalState(TMP_CONTAINER);
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
    vscode.commands.executeCommand(START_DEV_MODE, node);
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
  logger.error(`[uncatch exception] ${error.message} ${error.stack}`);
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

process.on("unhandledRejection", (error: any) => {
  if (error === "ignore") {
    return;
  }

  logger.error(
    `[unhandledRejection] ${(error && error.message) || error} ${
      error && error.stack
    }`
  );
  if (error && error.message === "read ENOTCONN") {
    return;
  }

  if (error.source === "api" && error.error && error.error.code) {
    if (
      error.error.message.includes(
        "routines:OPENSSL_internal:WRONG_VERSION_NUMBER"
      )
    ) {
      logger.info("api: occur" + error.error.message);
      return;
    }
    vscode.window.showErrorMessage(error.error.message);
  } else {
    const message: string = (error && error.message) || error;
    if (
      message &&
      message.includes("routines:OPENSSL_internal:WRONG_VERSION_NUMBER")
    ) {
      return;
    }
    vscode.window.showErrorMessage(message);
  }
});
