import * as vscode from "vscode";
import * as path from "path";
import { promises as fs } from "fs";

import ICommand from "./ICommand";
import { SIGN_OUT } from "./constants";
import registerCommand from "./register";

import state from "../state";
import { KUBE_CONFIG_DIR, NOCALHOST, SERVER_CLUSTER_LIST } from "../constants";
import host from "../host";
import { IRootNode, IUserInfo } from "../domain";
import { KubeConfigNode } from "../nodes/KubeConfigNode";
import Bookinfo from "../common/bookinfo";
import { kubeconfigCommand } from "../ctl/nhctl";
import { LoginInfo } from "../clusters/interface";
import { NocalhostRootNode } from "../nodes/NocalhostRootNode";
import messageBus from "../utils/messageBus";
import { virtualClusterProcMap } from "../clusters/AccountCluster";
import { getStringHash } from "../utils/common";

export default class SignOutCommand implements ICommand {
  command: string = SIGN_OUT;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: KubeConfigNode) {
    if (!node) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }

    try {
      await state.stopAutoRefresh(true);

      let globalUserList: {
        userInfo: IUserInfo;
        jwt: string;
        id: string;
      }[] = (host.getGlobalState(SERVER_CLUSTER_LIST) || []).filter(
        (it: any) => {
          if (!it.userInfo || !node.id) {
            return true;
          }
          return it.id !== node.id;
        }
      );
      host.setGlobalState(SERVER_CLUSTER_LIST, globalUserList);

      await state.disposeNode(node);

      Bookinfo.cleanCheck(node);

      const rootNode = state.getNode(NOCALHOST) as NocalhostRootNode;

      this.dispose(node);

      rootNode.deleteCluster(node.rootNode.loginInfo);

      messageBus.emit("refreshTree", {});
    } catch (error) {
      throw error;
    } finally {
      await state.refreshTree(true);
    }
  }

  dispose(node: KubeConfigNode) {
    this.killVClusterProcess(node);
    this.cleanKubeConfig(node.rootNode.loginInfo);
  }

  async killVClusterProcess(node: KubeConfigNode) {
    const rootNode = state.getData<Array<IRootNode>>("Nocalhost");

    const { username, baseUrl } = node.rootNode.loginInfo;

    rootNode.forEach((root) => {
      if (
        root.loginInfo.username !== username ||
        root.loginInfo.baseUrl !== baseUrl
      ) {
        return;
      }
      const { virtualCluster, kubeconfigType } = root.serviceAccount;
      if (
        kubeconfigType === "vcluster" &&
        virtualCluster.serviceType === "ClusterIP"
      ) {
        const { serviceAddress } = virtualCluster;

        let info = virtualClusterProcMap[serviceAddress];

        if (info?.proc.killed === false) {
          info.proc.kill();

          fs.unlink(root.kubeConfigPath);

          delete virtualClusterProcMap[serviceAddress];
        }
      }
    });
  }

  getFilePath(id: string) {
    return path.resolve(KUBE_CONFIG_DIR, id);
  }

  cleanKubeConfig(loginInfo: LoginInfo) {
    const { baseUrl, username } = loginInfo;
    const KEY = `USER_LINK:${baseUrl}@${username}`;

    const prevData = host.getGlobalState<Array<string>>(KEY);

    if (prevData) {
      prevData.map((id) => {
        kubeconfigCommand(this.getFilePath(id), "remove");
      });
    }

    host.removeGlobalState(KEY);
  }
}
