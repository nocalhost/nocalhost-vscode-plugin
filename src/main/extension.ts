// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import NocalhostAppProvider from "./appProvider";
import showLogin from "./commands/login";
import * as fileStore from "./store/fileStore";
import application from "./commands/application";
import {
  BASE_URL,
  EMAIL,
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
import { showDashboard } from "./webviews";
import {
  AppFolderNode,
  BaseNocalhostNode,
  ControllerResourceNode,
  DeploymentStatus,
  KubernetesResourceNode,
  NocalhostAccountNode,
} from "./nodes/nodeType";
import nocalhostService, {
  ControllerNodeApi,
} from "./service/nocalhostService";
import NocalhostFileSystemProvider from "./fileSystemProvider";
import * as shell from "shelljs";
import state from "./state";

export let appTreeView: vscode.TreeView<BaseNocalhostNode> | null | undefined;

export async function activate(context: vscode.ExtensionContext) {
  await init();

  let appTreeProvider = new NocalhostAppProvider();
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
        vscode.commands.executeCommand("useApplication", node);
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

    registerCommand(
      "Nocalhost.editServiceConfig",
      false,
      async (node: ControllerResourceNode) => {
        // open service config
        const appNode = node.getAppNode();
        const uri = vscode.Uri.parse(
          `NocalhostRW://nh/config/app/${appNode.label}/svcConfigs/${node.name}.yaml`
        );
        let doc = await vscode.workspace.openTextDocument(uri);
        vscode.window.showTextDocument(doc, { preview: false });
      }
    ),

    registerCommand(
      "Nocalhost.writeServiceConfig",
      false,
      async (node: ControllerResourceNode) => {
        // open service config
        const appNode = node.getAppNode();
        const uri = vscode.Uri.parse(
          `NocalhostRW://nh/config/app/${appNode.label}/svcConfigs/${node.name}.yaml`
        );
        let doc = await vscode.workspace.openTextDocument(uri);
        vscode.window.showTextDocument(doc, { preview: false });
      }
    ),

    registerCommand("showDashboard", false, () => {
      showDashboard(context);
    }),

    registerCommand(
      "Nocalhost.startDevMode",
      true,
      async (node: ControllerResourceNode) => {
        if (!node) {
          return;
        }
        // get app name
        const appName = fileStore.get(SELECTED_APP_NAME);
        if (!appName) {
          throw new Error("you must select one app");
        }
        // TODO: check Info
        await nocalhostService.startDevMode(host, appName, node);
      }
    ),
    registerCommand(
      "Nocalhost.endDevMode",
      true,
      async (node: ControllerResourceNode) => {
        // get app name
        const appName = fileStore.get(SELECTED_APP_NAME);
        await nocalhostService.endDevMode(host, appName, node);
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
      }
    }),
    registerCommand("Nocalhost.openEndPoint", false, async () => {
      const endpoint: string = fileStore.get(BASE_URL);
      vscode.env.openExternal(vscode.Uri.parse(endpoint));
    }),

    registerCommand("Nocalhost.signout", false, () => {
      fileStore.remove(JWT);
      fileStore.remove(EMAIL);
      state.setLogin(false);
    }),
    registerCommand("Nocalhost.signin", false, showLogin),

    registerCommand("getApplicationList", false, () =>
      appTreeProvider.refresh()
    ),
    registerCommand("Nocalhost.refresh", false, (node: BaseNocalhostNode) =>
      appTreeProvider.refresh(node)
    ),
    registerCommand(
      "Nocalhost.installApp",
      true,
      async (appNode: AppFolderNode) => {
        state.set(`${appNode.label}_installing`, true, {
          refresh: true,
          node: appNode,
        });
        await application.useApplication(appNode);
        // make siblings collapsis
        const siblings: (
          | AppFolderNode
          | NocalhostAccountNode
        )[] = await appNode.siblings();
        siblings.forEach((item) => {
          const node = item as AppFolderNode;
          node.collapsis();
        });

        await nocalhostService
          .install(
            host,
            appNode.info.name,
            appNode.id,
            appNode.devSpaceId,
            appNode.info.url,
            appNode.installType,
            appNode.resourceDir
          )
          .finally(() => {
            state.delete(`${appNode.label}_installing`, {
              refresh: true,
              node: appNode,
            });
            appNode.expanded();
            appNode.expandWorkloadNode();
          });
      }
    ),
    registerCommand(
      "Nocalhost.uninstallApp",
      true,
      async (appNode: AppFolderNode) => {
        state.set(`${appNode.label}_uninstalling`, true);
        await application.useApplication(appNode);
        await nocalhostService
          .uninstall(host, appNode.info.name, appNode.id, appNode.devSpaceId)
          .finally(() => {
            state.delete(`${appNode.label}_uninstalling`, {
              refresh: true,
              node: appNode,
            });
          });
      }
    ),
    registerCommand(
      "Nocalhost.editHelmValues",
      false,
      async (appNode: AppFolderNode) => {
        const uri = vscode.Uri.parse(
          `NocalhostRW://nh/helm-value/app/${appNode.label}.yaml`
        );
        let doc = await vscode.workspace.openTextDocument(uri);
        vscode.window.showTextDocument(doc, { preview: false });
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
          if (!node.installed()) {
            host.showInformationMessage(`${node.label} is not installed.`);
            return;
          }
          const name = node.info.name;
          const uri = vscode.Uri.parse(
            `Nocalhost://nh/loadResource/${name}.yaml`
          );
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
      async (node: ControllerResourceNode) => {
        await nocalhostService.exec(host, node);
      }
    ),
  ];

  context.subscriptions.push(...subs);
  vscode.commands.executeCommand("showDashboard");
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

    // start develop
    nocalhostService.startDevMode(host, tmpApp, node);
  }
}

function registerCommand(command: string, isLock: boolean, callback: any) {
  const dispose = vscode.commands.registerCommand(
    command,
    async (...args: any[]) => {
      checkCtl("nhctl");
      checkCtl("kubectl");
      checkCtl("git");
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
  // TODO: DISPOSE
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
  fileStore.mkdir(PLUGIN_CONFIG_DIR);
  fileStore.mkdir(KUBE_CONFIG_DIR);
  fileStore.mkdir(HELM_VALUES_DIR);
  fileStore.initConfig();
}
