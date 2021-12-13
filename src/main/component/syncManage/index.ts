import * as vscode from "vscode";

export { DISASSOCIATE_ASSOCIATE } from "./command";
import { registerCommand } from "./command";

import { SyncManageDataProvider } from "./provider";

export function createSyncManage(context: vscode.ExtensionContext) {
  const syncManageDataProvider = new SyncManageDataProvider();

  const treeView = vscode.window.createTreeView("NocalhostSyncManage", {
    treeDataProvider: syncManageDataProvider,
  });

  context.subscriptions.push(
    ...registerCommand(syncManageDataProvider),
    treeView.onDidChangeVisibility(({ visible }) => {
      syncManageDataProvider.changeVisible(visible);
    }),
    treeView
  );
}
