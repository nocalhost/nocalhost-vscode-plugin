// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";

import NocalhostAppProvider from "./appProvider";
import * as fileStore from "./store/fileStore";
import {
  BASE_URL,
  HELM_VALUES_DIR,
  JWT,
  KUBE_CONFIG_DIR,
  NH_CONFIG_DIR,
  PLUGIN_CONFIG_DIR,
  SELECTED_APP_NAME,
  TMP_APP,
  TMP_RESOURCE_TYPE,
  TMP_STATUS,
  TMP_WORKLOAD,
} from "./constants";
import host from "./host";
import {
  AppFolderNode,
  BaseNocalhostNode,
  DeploymentStatus,
} from "./nodes/nodeType";
import NocalhostFileSystemProvider from "./fileSystemProvider";
import * as shell from "shelljs";
import state from "./state";
import { SHOW_DASHBOARD, START_DEV_MODE } from "./commands/constants";
import initCommands from "./commands";
import { ControllerNodeApi } from "./commands/StartDevModeCommand";

export let appTreeView: vscode.TreeView<BaseNocalhostNode> | null | undefined;

export async function activate(context: vscode.ExtensionContext) {
  await init(context);
  let appTreeProvider = new NocalhostAppProvider();
  initCommands(context, appTreeProvider);
  let nocalhostFileSystemProvider = new NocalhostFileSystemProvider();
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
      if (node instanceof AppFolderNode) {
        const others = (await node.getParent().getChildren()).filter((item) => {
          if (item instanceof AppFolderNode && item.id !== node.id) {
            return true;
          } else {
            false;
          }
        });
        others.map((item) =>
          state.set(
            item.getNodeStateId(),
            vscode.TreeItemCollapsibleState.Collapsed
          )
        );
        const currentKubeConfigFullpath = path.resolve(
          KUBE_CONFIG_DIR,
          `${node.id}_${node.devSpaceId}_config`
        );
        fileStore.set(SELECTED_APP_NAME, node.info.name);
        fileStore.set(currentKubeConfigFullpath, currentKubeConfigFullpath);
        vscode.commands.executeCommand("Nocalhost.refresh");
      }

      state.set(
        node.getNodeStateId(),
        vscode.TreeItemCollapsibleState.Expanded
      );
    }
  );
  let subs = [
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
  ];

  context.subscriptions.push(...subs);
  vscode.commands.executeCommand(SHOW_DASHBOARD);
  const jwt = fileStore.get(JWT);
  if (jwt) {
    state.setLogin(true);
  }
  host.getOutputChannel().show(true);
  const tmpApp = fileStore.get(TMP_APP);
  const tmpWorkload = fileStore.get(TMP_WORKLOAD);
  const tmpStatusId = fileStore.get(TMP_STATUS);
  const tmpResourceType = fileStore.get(TMP_RESOURCE_TYPE);
  if (tmpApp && tmpWorkload && tmpStatusId && tmpResourceType) {
    fileStore.remove(TMP_APP);
    fileStore.remove(TMP_WORKLOAD);
    fileStore.remove(TMP_STATUS);
    fileStore.remove(TMP_RESOURCE_TYPE);

    const node: ControllerNodeApi = {
      name: tmpWorkload,
      resourceType: tmpResourceType,
      setStatus: (status: string, refresh?: boolean): Promise<void> => {
        return Promise.resolve(fileStore.set(tmpStatusId, status));
      },
      getStatus: () => DeploymentStatus.developing,
    };
    vscode.commands.executeCommand(START_DEV_MODE, node);
  }
}

export function deactivate() {
  // TODO: DISPOSE
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
  fileStore.initConfig();
  fileStore.set("extensionPath", context.extensionPath);
  updateServerConfigStatus();
}

process.on("uncaughtException", (error) => {
  vscode.window.showErrorMessage(error.message);
});

process.on("unhandledRejection", (error: any) => {
  vscode.window.showErrorMessage((error && error.message) || error);
});
