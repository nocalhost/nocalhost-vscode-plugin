import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import * as yaml from "yaml";
import { orderBy, get } from "lodash";

import AccountClusterService, {
  AccountClusterNode,
} from "../clusters/AccountCluster";
import LocalCusterService, { LocalClusterNode } from "../clusters/LocalCuster";
import { sortResources } from "../clusters";
import logger from "../utils/logger";
import { writeFileLock } from "../utils/fileUtil";

import {
  HELM_NH_CONFIG_DIR,
  LOCAL_PATH,
  SERVER_CLUSTER_LIST,
} from "../constants";
import { AppNode } from "./AppNode";
import { ROOT } from "./nodeContants";
import { BaseNocalhostNode } from "./types/nodeType";
import host from "../host";
import { isExistSync } from "../utils/fileUtil";
import state from "../state";
import { KubeConfigNode } from "./KubeConfigNode";
import { IRootNode } from "../domain";
import { ApplicationInfo } from "../api";

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
    logger.info(`[localClusterNodes]: ${JSON.stringify(localClusterNodes)}`);
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
        logger.error("[getLocalData error]");
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
      (it: AccountClusterNode) => it?.id
    );
    logger.info(
      `[globalClusterRootNodes]: ${JSON.stringify(globalClusterRootNodes)}`
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
        logger.error("[getServerData error]");
        logger.error(e);
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
      const appNode = (res.old || []).map(async (app: ApplicationInfo) => {
        let context = app.context;
        let obj: {
          url?: string;
          name?: string;
          appConfig?: string;
          nocalhostConfig?: string;
          installType: string;
          resourceDir: Array<string>;
        } = {
          installType: "rawManifest",
          resourceDir: ["manifest/templates"],
        };
        if (context) {
          let jsonObj = JSON.parse(context);
          obj.url = jsonObj["applicationUrl"];
          obj.name = jsonObj["applicationName"];
          obj.appConfig = jsonObj["applicationConfigPath"];
          obj.nocalhostConfig = jsonObj["nocalhostConfig"];
          let originInstallType = jsonObj["installType"];
          let source = jsonObj["source"];
          obj.installType = this.generateInstallType(source, originInstallType);
          obj.resourceDir = jsonObj["resourceDir"];
        }

        const nhConfigPath = path.resolve(
          HELM_NH_CONFIG_DIR,
          `${app.id}_${app.devspaceId}_config`
        );
        await writeFileLock(nhConfigPath, obj.nocalhostConfig || "");

        return new AppNode(
          this,
          obj.installType,
          obj.resourceDir,
          app.spaceName || obj.name || `app_${app.id}`,
          obj.appConfig || "",
          obj.nocalhostConfig || "",
          app.id,
          app.devspaceId,
          app.status,
          app.installStatus,
          app.kubeconfig,
          app
        );
      });

      if (res.isServer) {
        const kubeConfigObj = yaml.parse(res.kubeConfig);
        const contexts = kubeConfigObj["contexts"];

        const targetContext = (contexts || []).find(
          (item: { name: string }) => {
            return item.name === kubeConfigObj["current-context"];
          }
        );
        const clusterName = get(targetContext, "context.cluster", "devpool");
        const node = new KubeConfigNode(
          res.id,
          this,
          clusterName,
          res.devSpaces,
          res.applications,
          res.kubeConfig,
          false,
          res.localPath,
          res.userInfo,
          res.accountClusterService
        );
        devs.push(node);
      } else {
        const kubeStr = fs.readFileSync(res.localPath);
        const kubeConfigObj = yaml.parse(`${kubeStr}`);
        const contexts = kubeConfigObj["contexts"];

        const targetContext = (contexts || []).find(
          (item: { name: string }) => {
            return item.name === kubeConfigObj["current-context"];
          }
        );
        const clusterName = get(targetContext, "context.cluster", "devpool");
        const node = new KubeConfigNode(
          res.id,
          this,
          clusterName,
          res.devSpaces,
          res.applications,
          `${kubeStr}`,
          true,
          res.localPath,
          res.userInfo,
          null
        );
        devs.push(node);
      }
    }

    NocalhostRootNode.childNodes = NocalhostRootNode.childNodes.concat(devs);

    return orderBy(NocalhostRootNode.childNodes, ["label"]);
  }

  private generateInstallType(source: string, originInstallType: string) {
    let type = "helmRepo";

    if (source === "git" && originInstallType === "rawManifest") {
      type = "rawManifest";
    } else if (source === "git" && originInstallType === "helm_chart") {
      type = "helmGit";
    } else if (source === "local") {
      type = originInstallType;
    }
    return type;
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
