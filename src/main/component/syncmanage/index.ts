import * as vscode from "vscode";
import { registerCommand } from "./command";

import { SyncManageProvider } from "./provider";

export function createSyncManage(context: vscode.ExtensionContext) {
  const syncManageDataProvider = new SyncManageProvider();

  const treeView = vscode.window.createTreeView("NocalhostSyncManage", {
    treeDataProvider: syncManageDataProvider,
  });

  context.subscriptions.push(
    ...registerCommand(syncManageDataProvider),
    {
      dispose() {
        syncManageDataProvider.changeVisible(false);
      },
    },
    treeView.onDidChangeVisibility(({ visible }) => {
      syncManageDataProvider.changeVisible(visible);
    }),
    treeView
  );
}
