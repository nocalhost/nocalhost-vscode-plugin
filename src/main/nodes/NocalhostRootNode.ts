import * as assert from "assert";
import { get, orderBy } from "lodash";
import * as vscode from "vscode";
import { sortResources } from "../clusters";
import AccountClusterService, {
  AccountClusterNode,
  buildRootNodeForAccountCluster,
} from "../clusters/AccountCluster";
import { LoginInfo } from "../clusters/interface";
import LocalCusterService, {
  buildRootNodeForLocalCluster,
  LocalClusterNode,
} from "../clusters/LocalCuster";
import { ClusterSource } from "../common/define";
import {
  GLOBAL_TIMEOUT,
  LOCAL_PATH,
  NOCALHOST,
  SERVER_CLUSTER_LIST,
} from "../constants";
import { IRootNode } from "../domain";
import host from "../host";
import state from "../state";
import { asyncLimit } from "../utils";
import { isExistSync, readYaml } from "../utils/fileUtil";
import logger from "../utils/logger";
import { AppNode } from "./AppNode";
import { KubeConfigNode } from "./KubeConfigNode";
import { ROOT } from "./nodeContants";
import { BaseNocalhostNode } from "./types/nodeType";

export async function getClusterName(
  res: Pick<IRootNode, "kubeConfigPath" | "clusterSource">
) {
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
        if (token?.isCancellationRequested) {
          return Promise.reject();
        }

        assert(
          isExistSync(localCluster.filePath),
          `kubeconfig not exist:${localCluster.filePath}`
        );

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

        return buildRootNodeForLocalCluster(localCluster, {
          code: 201,
          info: result.reason,
        });
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

          return [
            buildRootNodeForAccountCluster(account, {
              code: 201,
              info: result.reason?.message,
            }),
          ];
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

    state.setData(this.getNodeStateId(), resultData, isInit);

    return resultData;
  }
  public async addCluster(node: AccountClusterNode | LocalClusterNode) {
    let addResources: IRootNode[];

    let resources = state.getData<Array<IRootNode>>(this.getNodeStateId());

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
        await LocalCusterService.getLocalClusterRootNode(node).catch((err) =>
          buildRootNodeForLocalCluster(node, { code: 201, info: err.message })
        ),
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
      ).catch((err) => [
        buildRootNodeForAccountCluster(node, {
          code: 201,
          info: err.message,
        }),
      ]);
    }
    if (resources) {
      resources = resources.concat(addResources);
    }

    resources = sortResources(resources);

    state.setData(this.getNodeStateId(), resources, false);
  }

  public deleteCluster(info: LoginInfo | string) {
    let resources = state.getData<Array<IRootNode>>(this.getNodeStateId());

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
        resources = resources.filter((item) => {
          if (item.clusterSource === ClusterSource.local) {
            return true;
          }

          const {
            username,
            baseUrl,
          } = (item.clusterInfo as AccountClusterNode).loginInfo;

          return !(username === info.username && baseUrl === info.baseUrl);
        });
      }
      resources = sortResources(resources);

      state.setData(this.getNodeStateId(), resources, false);
    }
  }

  public label: string = NOCALHOST;
  public type = ROOT;
  constructor(public parent: BaseNocalhostNode | null) {
    state.setNode(this.getNodeStateId(), this);
  }

  getParent(element: BaseNocalhostNode): BaseNocalhostNode | null | undefined {
    return;
  }

  async getKubeConfigNode(res: IRootNode) {
    const clusterName = await getClusterName(res);

    return new KubeConfigNode(res.id, this, clusterName, res);
  }
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<Array<BaseNocalhostNode>> {
    let resources = state.getData(this.getNodeStateId()) as IRootNode[];

    if (!resources) {
      resources = await this.updateData(true);
    }

    resources = resources.filter((it) => Boolean(it));

    const children = await asyncLimit(
      resources,
      this.getKubeConfigNode.bind(this)
    ).then((results) => {
      const nodes: BaseNocalhostNode[] = results.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        }

        const res = resources[index];

        let info = result.reason;

        if (result.reason instanceof Error) {
          info = result.reason.message;
          logger.error("get cluster error", result.reason, res.clusterInfo);
        }

        return new KubeConfigNode(res.id, this, res.clusterName, {
          ...res,
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
