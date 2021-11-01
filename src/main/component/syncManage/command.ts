import * as vscode from "vscode";

import { AssociateNode } from "./node";
import * as nhctl from "../../ctl/nhctl";
import host from "../../host";
import { SyncManageDataProvider } from "./provider";

const DISASSOCIATE_ASSOCIATE = "Nocalhost.disassociateAssociate";
const SWITCH_ASSOCIATE = "Nocalhost.switchAssociate";
const SYNCMANAGE_REFRESH = "Nocalhost.syncManage.refresh";

function disassociateAssociate(treeDataProvider: SyncManageDataProvider) {
  return vscode.commands.registerCommand(
    DISASSOCIATE_ASSOCIATE,
    async (node: AssociateNode) => {
      if (!node) {
        host.showWarnMessage("Failed to get node configs, please try again.");
        return;
      }

      const {
        associate: {
          svc_pack: { ns, app, svc, svc_type, container },
        },
        associate,
        currentPath,
      } = node;

      await nhctl.associate(
        associate.kubeconfig_path,
        ns,
        app,
        currentPath,
        svc_type,
        svc,
        container,
        "--de-associate"
      );

      treeDataProvider.refresh();
    }
  );
}
function switchAssociate(treeDataProvider: SyncManageDataProvider) {
  return vscode.commands.registerCommand(
    SWITCH_ASSOCIATE,
    (node: AssociateNode) => {
      if (!node) {
        host.showWarnMessage("Failed to get node configs, please try again.");
        return;
      }

      treeDataProvider.switchCurrent(node.associate);
    }
  );
}

function refresh(treeDataProvider: SyncManageDataProvider) {
  return vscode.commands.registerCommand(
    SYNCMANAGE_REFRESH,
    treeDataProvider.refresh
  );
}

export function registerCommand(treeDataProvider: SyncManageDataProvider) {
  return [
    disassociateAssociate(treeDataProvider),
    switchAssociate(treeDataProvider),
    refresh(treeDataProvider),
  ];
}
