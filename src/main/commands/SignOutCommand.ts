import * as vscode from "vscode";
import * as path from "path";

import ICommand from "./ICommand";
import { SIGN_OUT } from "./constants";
import registerCommand from "./register";

import state from "../state";
import { KUBE_CONFIG_DIR, SERVER_CLUSTER_LIST } from "../constants";
import host from "../host";
import { IUserInfo } from "../domain";
import { KubeConfigNode } from "../nodes/KubeConfigNode";
import Bookinfo from "../common/bookinfo";
import { AccountClusterNode } from "../clusters";
import { kubeconfig } from "../ctl/nhctl";
import { LoginInfo } from "../clusters/interface";

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
    host.stopAutoRefresh();

    let globalUserList: {
      userInfo: IUserInfo;
      jwt: string;
      id: string;
    }[] = (host.getGlobalState(SERVER_CLUSTER_LIST) || []).filter((it: any) => {
      if (!it.userInfo || !node.id) {
        return true;
      }
      return it.id !== node.id;
    });
    host.setGlobalState(SERVER_CLUSTER_LIST, globalUserList);

    await state.disposeNode(node);

    Bookinfo.cleanCheck(node);

    await state.refreshTree();

    this.cleanKubeConfig(node.accountClusterService.loginInfo);
  }

  cleanKubeConfig(loginInfo: LoginInfo) {
    const { baseUrl, username } = loginInfo;
    const KEY = `USER_LINK:${baseUrl}@${username}`;

    const prevData = host.getGlobalState(KEY);

    if (prevData) {
      Promise.allSettled(
        (prevData as Array<string>).map((id) => {
          return new Promise<void>(async (res, rej) => {
            const file = path.resolve(KUBE_CONFIG_DIR, id);

            await kubeconfig(file, "remove");

            res();
          });
        })
      );
    }

    host.removeGlobalState(KEY);
  }
}
