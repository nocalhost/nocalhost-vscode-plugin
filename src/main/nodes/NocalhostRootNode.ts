import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import * as yaml from "yaml";

import {
  ApplicationInfo,
  DevspaceInfo,
  getDevSpace,
  getV2Application,
  V2ApplicationInfo,
} from "../api";
import {
  HELM_NH_CONFIG_DIR,
  USERINFO,
  IS_LOCAL,
  LOCAL_PATH,
} from "../constants";
import { AppNode } from "./AppNode";
import { NocalhostAccountNode } from "./NocalhostAccountNode";
import { ROOT } from "./nodeContants";
import { BaseNocalhostNode } from "./types/nodeType";
import host from "../host";
// import DataCenter from "../common/DataCenter";
// import logger from "../utils/logger";
import state from "../state";
import { KubeConfigNode } from "./KubeConfigNode";
import * as kubectl from "../ctl/kubectl";

export class NocalhostRootNode implements BaseNocalhostNode {
  private static childNodes: Array<BaseNocalhostNode> = [];
  public static getChildNodes(): Array<BaseNocalhostNode> {
    return NocalhostRootNode.childNodes;
  }

  public async updateData(isInit?: boolean): Promise<any> {
    // const res = await getApplication();
    const isLocal = host.getGlobalState(IS_LOCAL);
    const localPaths = host.getGlobalState(LOCAL_PATH) as string[];
    let devSpaces: Array<DevspaceInfo> | undefined = new Array();
    let applications: Array<V2ApplicationInfo> | undefined = new Array();
    const objArr = new Array();
    if (isLocal && !state.isLogin()) {
      for (const localPath of localPaths) {
        const kubeStr = fs.readFileSync(localPath);
        const kubeConfigObj = yaml.parse(`${kubeStr}`);
        const contexts = kubeConfigObj["contexts"];
        const defaultNamespace = contexts[0]["context"]["namespace"] || "";
        devSpaces = await kubectl.getAllNamespace(
          localPath,
          defaultNamespace as string
        );
        const contextObj = {
          application_name: "default.application",
          application_url: "",
          application_config_path: "",
          nocalhost_config: "",
          source: "",
          resource_dir: "",
          install_type: "",
        };

        applications.push({
          id: 0,
          userId: 0,
          public: 1,
          editable: 1,
          context: JSON.stringify(contextObj),
          status: 1,
        });

        const obj = { devSpaces, applications, old: [], localPath };

        objArr.push(obj);
      }
    } else {
      devSpaces = await getDevSpace();
      applications = await getV2Application();
      const obj = { devSpaces, applications, old: [], localPath: "" };
      objArr.push(obj);
    }

    state.setData(this.getNodeStateId(), objArr, isInit);
    return objArr;
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
    let resources = state.getData(this.getNodeStateId()) as {
      devSpaces: DevspaceInfo[];
      applications: V2ApplicationInfo[];
      old: ApplicationInfo[];
      localPath: string;
    }[];

    if (!resources) {
      resources = await this.updateData(true);
    }
    const devs: KubeConfigNode[] = [];
    const isLocal = host.getGlobalState(IS_LOCAL) || false;
    let text = "";
    for (const res of resources) {
      const appNode = res.old.map((app) => {
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
          obj.url = jsonObj["application_url"];
          obj.name = jsonObj["application_name"];
          obj.appConfig = jsonObj["application_config_path"];
          obj.nocalhostConfig = jsonObj["nocalhost_config"];
          let originInstallType = jsonObj["install_type"];
          let source = jsonObj["source"];
          obj.installType = this.generateInstallType(source, originInstallType);
          obj.resourceDir = jsonObj["resource_dir"];
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

      if (!isLocal) {
        for (const d of res.devSpaces) {
          const kubeConfigObj = yaml.parse(d.kubeconfig);
          const node = new KubeConfigNode(
            this,
            kubeConfigObj["current-context"] || d.spaceName,
            [d],
            res.applications,
            d.kubeconfig,
            false,
            ""
          );
          devs.push(node);
        }
      } else {
        const kubeStr = fs.readFileSync(res.localPath);
        const kubeConfigObj = yaml.parse(`${kubeStr}`);
        const contexts = kubeConfigObj["contexts"];
        const defaultNamespace = contexts[0]["context"]["namespace"] || "";
        text = kubeConfigObj["current-context"];
        const node = new KubeConfigNode(
          this,
          kubeConfigObj["current-context"] || defaultNamespace,
          res.devSpaces,
          res.applications,
          `${kubeStr}`,
          true,
          res.localPath
        );
        devs.push(node);
      }
    }

    NocalhostRootNode.childNodes = NocalhostRootNode.childNodes.concat(devs);
    if (!isLocal) {
      const userinfo = host.getGlobalState(USERINFO);
      text = userinfo.name;
    }

    const hasAccountNode: boolean = NocalhostRootNode.childNodes.some(
      (node) => {
        return node instanceof NocalhostAccountNode;
      }
    );

    if (NocalhostRootNode.childNodes.length > 0 && !hasAccountNode) {
      NocalhostRootNode.childNodes.unshift(
        new NocalhostAccountNode(this, `Hi, ${text}`)
      );
    }
    return NocalhostRootNode.childNodes;
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
