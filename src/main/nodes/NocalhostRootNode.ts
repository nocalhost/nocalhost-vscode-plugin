import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import * as yaml from "yaml";
import { orderBy } from "lodash";

import AccountClusterService, {
  AccountClusterNode,
} from "../clusters/AccountCluster";
import LocalCusterService, { LocalClusterNode } from "../clusters/LocalCuster";
import { sortResources } from "../clusters";
import logger from "../utils/logger";

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
        console.log(e);
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
      const appNode = (res.old || []).map((app: ApplicationInfo) => {
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
        this.writeFile(nhConfigPath, obj.nocalhostConfig || "");

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
        const clusters = kubeConfigObj && kubeConfigObj["clusters"];
        const clusterName =
          clusters && clusters.length > 0 ? clusters[0]["name"] : "";
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
        // const contexts = kubeConfigObj["contexts"];
        const clusters = kubeConfigObj["clusters"];
        // const defaultNamespace = contexts[0]["context"]["namespace"] || "";
        const targetCluster = (clusters || []).find((it: { name: string }) => {
          return it.name === kubeConfigObj["current-context"];
        });
        const clusterName = targetCluster
          ? targetCluster.name
          : clusters[0].name;
        text = clusterName;
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

  private writeFile(filePath: string, writeData: string) {
    const isExist = fs.existsSync(filePath);
    if (isExist) {
      const data = fs.readFileSync(filePath).toString();
      if (data === writeData) {
        return;
      }
    }

    fs.writeFileSync(filePath, writeData, { mode: 0o600 });
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
