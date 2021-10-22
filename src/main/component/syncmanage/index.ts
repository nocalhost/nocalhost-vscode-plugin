import * as vscode from "vscode";

import { SyncManageProvider } from "./provider";

export function createSyncManage(context: vscode.ExtensionContext) {
  const treeDataProvider = new SyncManageProvider();

  const treeView = vscode.window.createTreeView("NocalhostSyncManage", {
    treeDataProvider,
  });

  context.subscriptions.push(
    {
      dispose() {
        treeDataProvider.changeVisible(false);
      },
    },
    treeView.onDidChangeVisibility(({ visible }) => {
      treeDataProvider.changeVisible(visible);
    }),
    treeView
  );
}
