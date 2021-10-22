import * as vscode from "vscode";

import { AssociateNode } from "./node";
import * as nhctl from "../../ctl/nhctl";
import host from "../../host";
import { SyncManageProvider } from "./provider";

const DISASSOCIATE_ASSOCIATE = "Nocalhost.disassociateAssociate";
const SWITCH_ASSOCIATE = "Nocalhost.switchAssociate";

function disassociateAssociate(treeDataProvider: SyncManageProvider) {
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

      treeDataProvider.refresh(true);
    }
  );
}
function switchAssociate(treeDataProvider: SyncManageProvider) {
  return vscode.commands.registerCommand(
    SWITCH_ASSOCIATE,
    (node: AssociateNode) => {
      if (!node) {
        host.showWarnMessage("Failed to get node configs, please try again.");
        return;
      }

      treeDataProvider.refresh(true);
    }
  );
}

export function registerCommand(treeDataProvider: SyncManageProvider) {
  return [
    disassociateAssociate(treeDataProvider),
    switchAssociate(treeDataProvider),
  ];
}
