import * as vscode from "vscode";
import { orderBy, get } from "lodash";

import AccountClusterService, {
  AccountClusterNode,
} from "../clusters/AccountCluster";
import LocalCusterService, { LocalClusterNode } from "../clusters/LocalCuster";
import { sortResources } from "../clusters";
import logger from "../utils/logger";

import { LOCAL_PATH, SERVER_CLUSTER_LIST } from "../constants";
import { AppNode } from "./AppNode";
import { ROOT } from "./nodeContants";
import { BaseNocalhostNode } from "./types/nodeType";
import host from "../host";
import { isExistSync, readYaml } from "../utils/fileUtil";
import state from "../state";
import { KubeConfigNode } from "./KubeConfigNode";
import { IRootNode } from "../domain";
import { ClusterSource } from "../common/define";
import { DevSpaceNode } from "./DevSpaceNode";

import arrayDiffer = require("array-differ");
import { asyncLimt } from "../utils";
import { GLOBAL_TIMEOUT } from "../commands/constants";

async function getClusterName(res: IRootNode) {
  if (!res.kubeConfigPath) {
    return "unknown";
  }

  if (res.clusterSource === ClusterSource.local) {
    const localClusterNode = LocalCusterService.getClusterNodeByKubeConfigPath(
      res.kubeConfigPath
    );

    if (localClusterNode && localClusterNode.clusterNickName) {
      return localClusterNode.clusterNickName;
    }
  }

  const kubeConfigObj = await readYaml(res.kubeConfigPath);
  const contexts = kubeConfigObj["contexts"];

  const targetContext = (contexts || []).find((item: { name: string }) => {
    return item.name === kubeConfigObj["current-context"];
  });

  const clusterName = get(targetContext, "context.cluster", "devpool");

  return clusterName;
}
export class NocalhostRootNode implements BaseNocalhostNode {
  public async getLocalData(): Promise<IRootNode[]> {
    const localClusterNodes =
      (host.getGlobalState(LOCAL_PATH) as LocalClusterNode[]) || [];

    let nodes = await asyncLimt(
      localClusterNodes,
      (localCluster) => {
        if (!isExistSync(localCluster.filePath)) {
          return Promise.reject();
        }

        return LocalCusterService.getLocalClusterRootNode(localCluster);
      },
      GLOBAL_TIMEOUT
    ).then((results) => {
      return results.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        }

        const localCluster = localClusterNodes[index];

        logger.error("get localCluster error", result.reason, localCluster);

        const root: IRootNode = {
          id: localCluster.id,
          devSpaces: [],
          clusterName: localCluster.clusterNickName,
          createTime: localCluster.createTime,
          clusterSource: ClusterSource.local,
          applications: [],
          kubeConfigPath: localCluster.filePath,
          state: {
            code: 201,
            info: result.reason,
          },
        };

        return root;
      });
    });

    nodes = nodes.filter((node) => node);

    return nodes;
  }
  public async getServerData(): Promise<IRootNode[]> {
    let globalClusterRootNodes: AccountClusterNode[] =
      host.getGlobalState(SERVER_CLUSTER_LIST) || [];

    globalClusterRootNodes = globalClusterRootNodes.filter(
      (it: AccountClusterNode) => it?.id
    );
    logger.info(
      `[globalClusterRootNodes]: ${JSON.stringify(globalClusterRootNodes)}`
    );

    let nodes = await asyncLimt(
      globalClusterRootNodes,
      (account) => AccountClusterService.getServerClusterRootNodes(account),
      GLOBAL_TIMEOUT
    ).then((results) => {
      return results
        .map((result, index) => {
          if (result.status === "fulfilled") {
            return result.value;
          }

          const account = globalClusterRootNodes[index];

          logger.error("get serverCluster error", result.reason, account);

          const rootNode: IRootNode = {
            devSpaces: [],
            applications: [],
            userInfo: account.userInfo,
            clusterSource: ClusterSource.server,
            accountClusterService: new AccountClusterService(account.loginInfo),
            id: account.id,
            createTime: account.createTime,
            kubeConfigPath: null,
            state: {
              code: 201,
              info: result.reason,
            },
          };

          return [rootNode];
        })
        .flat(1);
    });

    return nodes;
  }
  public async updateData(isInit?: boolean): Promise<any> {
    const results = await Promise.allSettled([
      this.getLocalData(),
      this.getServerData(),
    ]);

    const data = results.map((result) => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      return [];
    });

    let resultData = sortResources(data.flat(1));

    await this.cleanDiffDevSpace(resultData);

    state.setData(this.getNodeStateId(), sortResources(resultData), isInit);

    return resultData;
  }

  private async cleanDiffDevSpace(resources: IRootNode[]) {
    if (state.getData(this.getNodeStateId())) {
      const children = await this.getChildren();

      if (children.length) {
        const diff: string[] = arrayDiffer(
          children
            .map((node) => {
              return (node as KubeConfigNode).devSpaceInfos.map(
                (item) => item.spaceName || item.namespace
              );
            })
            .flat(1),
          resources
            .map((item) =>
              item.devSpaces.map((item) => item.spaceName || item.namespace)
            )
            .flat(1)
        );

        if (diff.length) {
          const devSpaceNodes: DevSpaceNode[] = (
            await Promise.all(
              children.map((node) => node.getChildren() as DevSpaceNode[])
            )
          ).flat(1);

          diff.forEach((name) => {
            const node = devSpaceNodes.find((item) => item.label === name);

            node && state.disposeNode(node);
          });
        }
      }
    }
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
    let resources = state.getData(this.getNodeStateId()) as IRootNode[];

    if (!resources) {
      resources = await this.updateData(true);
    }

    resources = resources.filter((it) => Boolean(it));

    const children = await asyncLimt(resources, async (res) => {
      const clusterName = await getClusterName(res);

      return new KubeConfigNode({
        id: res.id,
        label: clusterName,
        parent: this,
        kubeConfigPath: res.kubeConfigPath,
        devSpaceInfos: res.devSpaces,
        applications: res.applications,
        userInfo: res.userInfo,
        clusterSource: res.clusterSource,
        accountClusterService: res.accountClusterService,
        state: res.state,
      });
    }).then((results) => {
      const devs: BaseNocalhostNode[] = results.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        }

        const res = resources[index];

        let info = result.reason;

        if (result.reason instanceof Error) {
          info = result.reason.message;
          logger.error("get serverCluster error", result.reason, res.userInfo);
        }

        return new KubeConfigNode({
          id: res.id,
          label: res.clusterName,
          parent: this,
          kubeConfigPath: res.kubeConfigPath,
          devSpaceInfos: res.devSpaces,
          applications: res.applications,
          userInfo: res.userInfo,
          clusterSource: res.clusterSource,
          accountClusterService: res.accountClusterService,
          state: {
            code: 201,
            info,
          },
        });
      });

      return orderBy(devs, ["label"]);
    });

    return children;
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
