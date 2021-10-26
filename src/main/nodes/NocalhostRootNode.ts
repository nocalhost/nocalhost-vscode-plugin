import * as vscode from "vscode";
import { orderBy, get, difference } from "lodash";

import AccountClusterService, {
  AccountClusterNode,
} from "../clusters/AccountCluster";
import LocalCusterService, { LocalClusterNode } from "../clusters/LocalCuster";
import { sortResources } from "../clusters";
import logger from "../utils/logger";

import {
  GLOBAL_TIMEOUT,
  LOCAL_PATH,
  NOCALHOST,
  SERVER_CLUSTER_LIST,
} from "../constants";
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

import { asyncLimit } from "../utils";
import { LoginInfo } from "../clusters/interface";

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
  private async getLocalData(
    token?: vscode.CancellationToken
  ): Promise<IRootNode[]> {
    const localClusterNodes =
      (host.getGlobalState(LOCAL_PATH) as LocalClusterNode[]) || [];

    let nodes = await asyncLimit(
      localClusterNodes,
      (localCluster) => {
        if (
          token?.isCancellationRequested ||
          !isExistSync(localCluster.filePath)
        ) {
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
          ...localCluster,
          clusterSource: ClusterSource.local,
          clusterName: localCluster.clusterNickName,
          kubeConfigPath: localCluster.filePath,
          devSpaces: [],
          applications: [],
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

  private async getServerData(
    token?: vscode.CancellationToken
  ): Promise<IRootNode[]> {
    let globalClusterRootNodes: AccountClusterNode[] =
      host.getGlobalState(SERVER_CLUSTER_LIST) || [];

    globalClusterRootNodes = globalClusterRootNodes.filter(
      (it: AccountClusterNode) => it?.id
    );
    logger.info(
      `[globalClusterRootNodes]: ${JSON.stringify(globalClusterRootNodes)}`
    );

    let nodes = await asyncLimit(
      globalClusterRootNodes,
      (account) => {
        if (token?.isCancellationRequested) {
          return Promise.reject();
        }
        return AccountClusterService.getServerClusterRootNodes(account);
      },
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
            ...account,
            clusterSource: ClusterSource.server,
            accountClusterService: new AccountClusterService(account.loginInfo),
            devSpaces: [],
            applications: [],
            kubeConfigPath: null,
            state: {
              code: 201,
              info: result.reason?.message,
            },
          };

          return [rootNode];
        })
        .flat(1);
    });

    return nodes;
  }
  public async updateData(
    isInit?: boolean,
    token?: vscode.CancellationToken
  ): Promise<any> {
    const results = await Promise.allSettled([
      this.getLocalData(token),
      this.getServerData(token),
    ]);

    if (token?.isCancellationRequested) {
      return;
    }

    const data = results.map((result) => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      return [];
    });

    let resultData = sortResources(data.flat(1));

    await this.cleanDiffDevSpace(resultData);

    state.setData(this.getNodeStateId(), resultData, isInit);

    return resultData;
  }
  public async addCluster(node: AccountClusterNode | LocalClusterNode) {
    let addResources: IRootNode[];

    let resources = state.getData(this.getNodeStateId()) as IRootNode[];

    if (node instanceof LocalClusterNode) {
      if (
        resources.findIndex(
          (item) =>
            item.clusterSource === ClusterSource.local &&
            item.kubeConfigPath === node.filePath
        ) > -1
      ) {
        return;
      }

      addResources = [
        await LocalCusterService.getLocalClusterRootNode(node).catch((err) => {
          return {
            ...node,
            kubeConfigPath: node.filePath,
            devSpaces: [],
            applications: [],
            state: {
              code: 201,
              info: err.message,
            },
          };
        }),
      ];
    } else {
      if (
        resources.findIndex(
          (item) =>
            item.clusterSource === ClusterSource.server && item.id === node.id
        ) > -1
      ) {
        return;
      }

      addResources = await AccountClusterService.getServerClusterRootNodes(
        node
      ).catch((err) => {
        return [
          {
            ...node,
            kubeConfigPath: null,
            clusterSource: ClusterSource.server,
            accountClusterService: new AccountClusterService(node.loginInfo),
            devSpaces: [],
            applications: [],
            state: {
              code: 201,
              info: err.message,
            },
          },
        ];
      });
    }
    if (resources) {
      resources = resources.concat(addResources);
    }

    resources = sortResources(resources);

    state.setData(this.getNodeStateId(), resources, false);
  }

  public async deleteCluster(info: LoginInfo | string) {
    let resources = state.getData(this.getNodeStateId()) as IRootNode[];

    if (resources) {
      if (typeof info === "string") {
        resources = resources.filter(
          (item) =>
            !(
              item.clusterSource === ClusterSource.local &&
              item.kubeConfigPath === info
            )
        );
      } else {
        resources = resources.filter((item: any) => {
          if (item.clusterSource === ClusterSource.local) {
            return true;
          }

          const node = item as KubeConfigNode;
          const { username, baseUrl } = node.accountClusterService?.loginInfo;

          return !(username === info.username && baseUrl === info.baseUrl);
        });
      }
      resources = sortResources(resources);

      await this.cleanDiffDevSpace(resources);

      state.setData(this.getNodeStateId(), resources, false);
    }
  }

  private async cleanDiffDevSpace(resources: IRootNode[]) {
    // const oldResources = state.getData(this.getNodeStateId()) as
    if (state.getData(this.getNodeStateId())) {
      const children = (await this.getChildren()) as KubeConfigNode[];

      if (children.length) {
        const diff: string[] = difference(
          children.map((item) => item.id),
          resources.map((item) => item.id!)
        );

        if (diff.length) {
          diff.forEach((id) => {
            state.disposeNode({
              getNodeStateId() {
                return id;
              },
            });
          });
        }
      }
    }
  }

  public label: string = NOCALHOST;
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

    const children = await asyncLimit(resources, async (res) => {
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
      const nodes: BaseNocalhostNode[] = results.map((result, index) => {
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

      return orderBy(nodes, ["label"]);
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
    return NOCALHOST;
  }
}
