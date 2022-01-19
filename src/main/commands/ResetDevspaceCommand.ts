import * as vscode from "vscode";

import ICommand from "./ICommand";
import { RESET_DEVSPACE } from "./constants";
import registerCommand from "./register";
import state from "../state";
import host, { Host } from "../host";
import * as nhctl from "../ctl/nhctl";
import { DevSpaceNode } from "../nodes/DevSpaceNode";
import Bookinfo from "../common/bookinfo";
import messageBus from "../utils/messageBus";
import { KubeConfigNode } from "../nodes/KubeConfigNode";

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

    await this.reset(host, node)
      .then(() => {
        messageBus.emit("refreshTree", {});
      })
      .finally(async () => {
        const parent = node.parent.parent;

        await parent.updateData();

        vscode.commands.executeCommand("Nocalhost.refresh", parent);

        state.delete(node.info.spaceName);
      });
  }

  private async reset(host: Host, node: DevSpaceNode) {
    const {
      getKubeConfigPath,
      info: { namespace, spaceName },
    } = node;

    host.log(`Resetting devspace: ${spaceName}`, true);

    await nhctl.resetApp(getKubeConfigPath.call(node), namespace, spaceName);

    host.removeGlobalState(spaceName);
    host.log(`Devspace ${spaceName} reset`, true);
    host.showInformationMessage(`Devspace ${spaceName} reset`);

    await (node.parent as KubeConfigNode).accountClusterService?.resetDevSpace(
      node.info.id
    );
  }
}
