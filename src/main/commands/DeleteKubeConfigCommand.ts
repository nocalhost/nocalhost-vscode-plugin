import * as vscode from "vscode";
import * as fs from "fs";
import ICommand from "./ICommand";
import { DELETE_KUBECONFIG } from "./constants";
import registerCommand from "./register";
import { LOCAL_PATH, NOCALHOST } from "../constants";
import state from "../state";
import { isExist } from "../utils/fileUtil";
import host from "../host";
import { LocalClusterNode } from "../clusters/LocalCuster";
import { KubeConfigNode } from "../nodes/KubeConfigNode";
import Bookinfo from "../common/bookinfo";
import { kubeconfigCommand } from "../ctl/nhctl";
import { NocalhostRootNode } from "../nodes/NocalhostRootNode";
import messageBus from "../utils/messageBus";

export default class DeleteKubeConfigCommand implements ICommand {
  command: string = DELETE_KUBECONFIG;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: KubeConfigNode) {
    if (!node) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }

    const localClusterNodes: LocalClusterNode[] = host.getGlobalState(
      LOCAL_PATH
    ) as LocalClusterNode[];
    const kubeConfigPath = node.getKubeConfigPath();
    const index = localClusterNodes.findIndex(
      (it: LocalClusterNode) => it.filePath === kubeConfigPath
    );
    if (index < 0) {
      return;
    }
    let tmpPath = [...(localClusterNodes || [])];
    let deleted: LocalClusterNode[] = [];
    if (localClusterNodes.length > 0) {
      deleted = tmpPath.splice(index, 1);
    } else {
      tmpPath = [];
    }
    host.setGlobalState(LOCAL_PATH, tmpPath);

    await state.disposeNode(node);

    Bookinfo.cleanCheck(node);

    const rootNode = state.getNode(NOCALHOST) as NocalhostRootNode;

    await rootNode.deleteCluster(kubeConfigPath);

    await state.refreshTree(true);

    messageBus.emit("refreshTree", {});

    deleted.forEach(async (f) => {
      if (await isExist(f.filePath)) {
        await kubeconfigCommand(f.filePath, "remove");

        fs.unlinkSync(f.filePath);
      }
    });

    // if (tmpPath.length === 0) {
    //   await vscode.commands.executeCommand(SIGN_OUT);
    // } else {
    //   await vscode.commands.executeCommand(REFRESH);
    // }
  }
}
