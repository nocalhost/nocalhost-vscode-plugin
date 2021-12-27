import * as vscode from "vscode";
import { difference, orderBy } from "lodash";
import * as fs from "fs";
import * as yaml from "yaml";

import state from "../state";
import AccountClusterService from "../clusters/AccountCluster";
import { ID_SPLIT } from "./nodeContants";
import { ClusterSource } from "../common/define";
import { BaseNocalhostNode } from "./types/nodeType";
import { NocalhostFolderNode } from "./abstract/NocalhostFolderNode";
import { NocalhostRootNode } from "./NocalhostRootNode";
import { isExistSync, resolveVSCodeUri } from "../utils/fileUtil";
import {
  IUserInfo,
  IV2ApplicationInfo,
  IRootNode,
  IDevSpaceInfo,
} from "../domain";
import { ClustersState } from "../clusters";
import host from "../host";
import { getAllNamespace } from "../ctl/nhctl";
import { DevSpaceNode, getDevSpaceLabel } from "./DevSpaceNode";

export class KubeConfigNode extends NocalhostFolderNode {
  public label: string;
  public type = "KUBECONFIG";
  public userInfo: IUserInfo;
  public clusterSource: ClusterSource;
  public applications: Array<IV2ApplicationInfo>;
  public parent: NocalhostRootNode;
  public installedApps: {
    name: string;
    type: string;
  }[] = [];
  public id: string;
  public kubeConfigPath: string;
  public accountClusterService: AccountClusterService;

  private state: ClustersState;
  constructor(
    id: string,
    parent: NocalhostRootNode,
    label: string,
    private rootNode: IRootNode
  ) {
    super();

    const {
      applications,
      clusterSource,
      kubeConfigPath,
      userInfo,
      accountClusterService,
    } = rootNode;

    this.id = id;
    this.parent = parent;
    this.clusterSource = clusterSource;

    this.label = label;
    this.applications = applications;
    this.installedApps = [];
    this.kubeConfigPath = kubeConfigPath;
    this.userInfo = userInfo;
    this.accountClusterService = accountClusterService;
    this.state = rootNode.state;

    state.setNode(this.getNodeStateId(), this);
  }
  async updateData() {
    if (this.state.code !== 200) {
      return [];
    }

    let devSpaces = Array.of<IDevSpaceInfo>();
    const { kubeConfigPath } = this;

    if (this.clusterSource === ClusterSource.local) {
      if (!isExistSync(kubeConfigPath)) {
        host.log(`no such file or directory: ${kubeConfigPath}`);
        return;
      }

      const kubeStr = fs.readFileSync(kubeConfigPath);
      const kubeConfigObj = yaml.parse(`${kubeStr}`);
      const contexts = kubeConfigObj["contexts"];
      if (!contexts || contexts.length === 0) {
        return;
      }

      let namespace = contexts[0]["context"]["namespace"] || "";

      if (kubeConfigObj["current-context"]) {
        const currentContext = contexts.find(
          (it: any) => it.name === kubeConfigObj["current-context"]
        );
        if (currentContext) {
          namespace = currentContext.context.namespace;
        }
      }

      devSpaces = await getAllNamespace({
        kubeConfigPath: kubeConfigPath,
        namespace,
      });
    } else {
      const sa = this.rootNode.serviceAccount;

      if (sa.privilege) {
        devSpaces = await getAllNamespace({
          kubeConfigPath: kubeConfigPath,
          namespace: "default",
        });

        for (const dev of devSpaces) {
          dev.storageClass = sa.storageClass;
          dev.devStartAppendCommand = [
            "--priority-class",
            "nocalhost-container-critical",
          ];
          dev.kubeconfig = sa.kubeconfig;

          const ns = sa.namespacePacks?.find(
            (ns) => ns.namespace === dev.namespace
          );

          dev.spaceId = ns?.spaceId;
          dev.spaceName = ns?.spacename;

          if (sa.privilegeType === "CLUSTER_ADMIN") {
            dev.spaceOwnType = "Owner";
          } else if (sa.privilegeType === "CLUSTER_VIEWER") {
            dev.spaceOwnType = ns?.spaceOwnType ?? "Viewer";
          }
        }
      } else {
        for (const ns of sa.namespacePacks) {
          const devInfo: IDevSpaceInfo = {
            id: ns.spaceId,
            spaceName: ns.spacename,
            namespace: ns.namespace,
            kubeconfig: sa.kubeconfig,
            accountClusterService: this.accountClusterService,
            clusterId: sa.clusterId,
            storageClass: sa.storageClass,
            spaceOwnType: ns.spaceOwnType,
            devStartAppendCommand: [
              "--priority-class",
              "nocalhost-container-critical",
            ],
          };
          devSpaces.push(devInfo);
        }
      }
    }

    state.setData(this.getNodeStateId(), devSpaces);

    this.cleanDiffDevSpace(devSpaces);

    return devSpaces;
  }

  private async cleanDiffDevSpace(resources: Array<IDevSpaceInfo>) {
    const old = state.getData<Array<IDevSpaceInfo>>(this.getNodeStateId());

    if (old && old.length && resources.length) {
      const getId = (devSpace: IDevSpaceInfo) =>
        `${this.getNodeStateId()}${ID_SPLIT}${getDevSpaceLabel(devSpace)}`;

      const diff: string[] = difference(old.map(getId), resources.map(getId));

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

  public getKubeConfigPath() {
    return this.kubeConfigPath;
  }

  async getChildren(parent?: BaseNocalhostNode): Promise<BaseNocalhostNode[]> {
    let devSpaces = Array.of<IDevSpaceInfo>();

    if (this.state.code !== 200) {
      return [];
    }

    devSpaces = state.getData<Array<IDevSpaceInfo>>(this.getNodeStateId());

    if (!devSpaces) {
      devSpaces = await this.updateData();
    }

    const devSpace = devSpaces.map((devSpace) => {
      return Object.assign(
        new DevSpaceNode(this, devSpace, this.applications, this.clusterSource),
        {
          order: devSpace.spaceOwnType !== "Viewer",
          isSpace: devSpace.spaceId > 0,
        }
      );
    });

    return orderBy(
      devSpace,
      ["order", "isSpace", "label"],
      ["desc", "desc", "asc"]
    );
  }

  async getTreeItem() {
    let treeItem = new vscode.TreeItem(
      this.label,
      this.state.code === 200
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    treeItem.contextValue = `kubeconfig${
      this.clusterSource === ClusterSource.local ? "-local" : "-server"
    }`;

    if (this.clusterSource === ClusterSource.server) {
      const { username, baseUrl } = this.accountClusterService.loginInfo;

      treeItem.tooltip = `${this.label} [${username} on ${baseUrl}]`;
    }

    treeItem.description = "Active";
    treeItem.iconPath = resolveVSCodeUri("cluster_active.svg");

    if (this.state.code !== 200) {
      treeItem.tooltip = this.state.info;
      treeItem.iconPath = resolveVSCodeUri("cluster_warning.svg");
      treeItem.description = "Unable to Connect";
    }

    return Promise.resolve(treeItem);
  }

  getNodeStateId(): string {
    return `${this.id}${this.parent.getNodeStateId()}${ID_SPLIT}${this.label}`;
  }

  getParent(): NocalhostRootNode {
    return this.parent;
  }
}
