import vscode from "vscode";

import ICommand from "./ICommand";
import { RESET_DEVSPACE } from "./constants";
import registerCommand from "./register";
import state from "../state";
import host, { Host } from "../host";
import * as nhctl from "../ctl/nhctl";
import { DevSpaceNode } from "../nodes/DevSpaceNode";
import { NocalhostRootNode } from "../nodes/NocalhostRootNode";
import Bookinfo from "../common/bookinfo";
import messageBus from "../utils/messageBus";

export default class ResetDevspaceCommand implements ICommand {
  command: string = RESET_DEVSPACE;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, true, this.execCommand.bind(this));
  }
  async execCommand(node: DevSpaceNode) {
    if (!node) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }
    const result = await host.showInformationMessage(
      `Reset devspace: ${node.info.spaceName}?`,
      { modal: true },
      `OK`
    );
    if (!result) {
      return;
    }

    await state.disposeNode(node);

    await Bookinfo.cleanCheck(node);

    state.setAppState(node.getNodeStateId(), "resetting", true);

    await vscode.commands.executeCommand("Nocalhost.refresh", node);

    host.disposeDevspace(node.info.spaceName);
    await this.reset(
      host,
      node.getKubeConfigPath(),
      node.info.namespace,
      node.info.spaceName
    ).finally(async () => {
      await node.parent.accountClusterService.resetDevSpace(node.info.id);

      const nocalhostRootNode = node.parent.parent as NocalhostRootNode;

      await nocalhostRootNode.updateData();

      vscode.commands.executeCommand("Nocalhost.refresh", nocalhostRootNode);

      state.delete(node.info.spaceName);
    });

    messageBus.emit("refreshTree", {});
  }

  private async reset(
    host: Host,
    kubeconfigPath: string,
    namespace: string,
    devspaceName: string
  ) {
    host.log(`Reseting devspace: ${devspaceName}`, true);
    await nhctl.resetApp(kubeconfigPath, namespace, devspaceName);
    host.removeGlobalState(devspaceName);
    host.log(`Devspace ${devspaceName} reset`, true);
    host.showInformationMessage(`Devspace ${devspaceName} reset`);
  }
}
