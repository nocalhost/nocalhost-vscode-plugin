import { AppNode } from "./AppNode";
import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import * as yaml from "yaml";
import { orderBy } from "lodash";

import AccountClusterService, {
  AccountClusterNode,
} from "../clusters/AccountCluster";
import LocalCusterService, { LocalClusterNode } from "../clusters/LocalCuster";
import { ClusterSource } from "../clusters/interface";
import { sortResources } from "../clusters";
import logger from "../utils/logger";

import { LOCAL_PATH, SERVER_CLUSTER_LIST } from "../constants";
import { ROOT } from "./nodeContants";
import { BaseNocalhostNode } from "./types/nodeType";
import host from "../host";
import { isExistSync, readYaml } from "../utils/fileUtil";
import state from "../state";
import { KubeConfigNode } from "./KubeConfigNode";
import { IRootNode } from "../domain";

export class NocalhostRootNode implements BaseNocalhostNode {
  private static childNodes: Array<BaseNocalhostNode> = [];
  public static getChildNodes(): Array<BaseNocalhostNode> {
    return NocalhostRootNode.childNodes;
  }
  public async getLocalData() {
    const localClusterNodes = (
      (host.getGlobalState(LOCAL_PATH) as LocalClusterNode[]) || []
    ).filter((s) => {
      return isExistSync(s.filePath);
    });
    const objArr = [];
    for (const localCluster of localClusterNodes || []) {
      try {
        const obj = await LocalCusterService.getLocalClusterRootNode(
          localCluster
        );
        if (obj) {
          objArr.push(obj);
        }
      } catch (e) {
        logger.error(e);
        host.log(e, true);
      }
    }
    return objArr;
  }
  public async getServerData() {
    let globalClusterRootNodes: AccountClusterNode[] =
      host.getGlobalState(SERVER_CLUSTER_LIST) || [];
    globalClusterRootNodes = globalClusterRootNodes.filter(
      (it: AccountClusterNode) => it.id
    );
    let objArr: any = [];
    for (
      let i = 0, clusterAccount = null;
      i < globalClusterRootNodes.length;
      i += 1
    ) {
      try {
        clusterAccount = globalClusterRootNodes[i];
        const result =
          (await AccountClusterService.getServerClusterRootNodes(
            clusterAccount
          )) || [];
        objArr = [...objArr, ...result];
      } catch (e) {
        console.log(e);
        logger.error(e);
        host.log(e, true);
      }
    }
    return objArr;
  }
  public async updateData(isInit?: boolean): Promise<any> {
    // const res = await getApplication();
    const localData = (await this.getLocalData()) || [];
    const serverData = (await this.getServerData()) || [];
    const resultData = sortResources([...localData, ...serverData]);
    state.setData(this.getNodeStateId(), sortResources(resultData), isInit);
    return resultData;
  }

  public label: string = "Nocalhost";
  public type = ROOT;
  constructor(public parent: BaseNocalhostNode | null) {
    console.log(AppNode);
    state.setNode(this.getNodeStateId(), this);
  }

  getParent(element: BaseNocalhostNode): BaseNocalhostNode | null | undefined {
    return;
  }

  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<Array<BaseNocalhostNode>> {
    NocalhostRootNode.childNodes = [];
    // DataCenter.getInstance().setApplications();
    let resources = state.getData(this.getNodeStateId()) as IRootNode[];

    if (!resources) {
      resources = await this.updateData(true);
    }
    resources = resources.filter((it) => Boolean(it));
    const devs: KubeConfigNode[] = [];
    let text = "";
    for (const res of resources) {
      if (res.clusterSource === ClusterSource.server) {
        const kubeConfigObj = await readYaml(res.kubeConfigPath);
        const clusters = kubeConfigObj && kubeConfigObj["clusters"];
        const clusterName =
          clusters && clusters.length > 0 ? clusters[0]["name"] : "";
        const node = new KubeConfigNode({
          id: res.id,
          parent: this,
          label: clusterName,
          devSpaceInfos: res.devSpaces,
          applications: res.applications,
          kubeConfigPath: res.kubeConfigPath,
          userInfo: res.userInfo,
          clusterSource: ClusterSource.server,
          accountClusterService: res.accountClusterService,
        });
        devs.push(node);
      } else {
        const kubeConfigObj = await readYaml(res.kubeConfigPath);
        const clusters = kubeConfigObj["clusters"];
        const targetCluster = (clusters || []).find((it: { name: string }) => {
          return it.name === kubeConfigObj["current-context"];
        });
        const clusterName = targetCluster
          ? targetCluster.name
          : clusters[0].name;
        text = clusterName;
        const node = new KubeConfigNode({
          id: res.id,
          clusterSource: ClusterSource.local,
          parent: this,
          label: clusterName,
          devSpaceInfos: res.devSpaces,
          applications: res.applications,
          kubeConfigPath: res.kubeConfigPath,
          userInfo: res.userInfo,
          accountClusterService: null,
        });
        devs.push(node);
      }
    }

    NocalhostRootNode.childNodes = NocalhostRootNode.childNodes.concat(devs);

    return orderBy(NocalhostRootNode.childNodes, ["label"]);
  }
  getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let treeItem = new vscode.TreeItem(
      this.label,
      vscode.TreeItemCollapsibleState.Collapsed
    );
    return treeItem;
  }

  getNodeStateId(): string {
    return "Nocalhost";
  }
}
