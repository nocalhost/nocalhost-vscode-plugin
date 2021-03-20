import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import {
  ApplicationInfo,
  DevspaceInfo,
  getApplication,
  getDevSpace,
  getV2Application,
  V2ApplicationInfo,
} from "../api";
import { KUBE_CONFIG_DIR, HELM_NH_CONFIG_DIR, USERINFO } from "../constants";
import { AppNode } from "./AppNode";
import { NocalhostAccountNode } from "./NocalhostAccountNode";
import { ROOT } from "./nodeContants";
import { BaseNocalhostNode } from "./types/nodeType";
import host from "../host";
// import DataCenter from "../common/DataCenter";
import logger from "../utils/logger";
import state from "../state";
import { DevSpaceNode } from "./DevSpaceNode";
import * as nhctl from "../ctl/nhctl";

export class NocalhostRootNode implements BaseNocalhostNode {
  private static childNodes: Array<BaseNocalhostNode> = [];
  public static getChildNodes(): Array<BaseNocalhostNode> {
    return NocalhostRootNode.childNodes;
  }

  public async updateData(isInit?: boolean): Promise<any> {
    // const res = await getApplication();
    const devSpaces = await getDevSpace();
    const applications = await getV2Application();
    const installedApps = await nhctl.getInstalledApp();
    const obj = { devSpaces, applications, old: [], installedApps };

    state.setData(this.getNodeStateId(), obj, isInit);
    return obj;
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
    let res = state.getData(this.getNodeStateId()) as {
      devSpaces: DevspaceInfo[];
      applications: V2ApplicationInfo[];
      old: ApplicationInfo[];
      installedApps: nhctl.AllInstallAppInfo[];
    };

    if (!res) {
      res = await this.updateData(true);
    }
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
    const devs: DevSpaceNode[] = [];

    res.applications.forEach((app) => {
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

      const nhConfigPath = path.resolve(HELM_NH_CONFIG_DIR, `${app.id}_config`);
      this.writeFile(nhConfigPath, obj.nocalhostConfig || "");
    });

    for (const d of res.devSpaces) {
      const filePath = path.resolve(KUBE_CONFIG_DIR, `${d.id}_config`);
      this.writeFile(filePath, d.kubeconfig);
      let installedApps = this.getInstalledApp(res.installedApps, d.namespace);
      const node = new DevSpaceNode(
        this,
        d.spaceName,
        d,
        res.applications,
        installedApps
      );
      devs.push(node);
    }
    NocalhostRootNode.childNodes = NocalhostRootNode.childNodes.concat(devs);

    const userinfo = host.getGlobalState(USERINFO);

    const hasAccountNode: boolean = NocalhostRootNode.childNodes.some(
      (node) => {
        return node instanceof NocalhostAccountNode;
      }
    );

    if (NocalhostRootNode.childNodes.length > 0 && !hasAccountNode) {
      NocalhostRootNode.childNodes.unshift(
        new NocalhostAccountNode(this, `Hi, ${userinfo.name}`)
      );
    }
    return NocalhostRootNode.childNodes;
  }

  private getInstalledApp(
    allAppInfo: nhctl.AllInstallAppInfo[],
    namespace: string
  ) {
    const infos = allAppInfo.filter((item) => item.namespace === namespace);
    let result = new Array<nhctl.InstalledAppInfo>();
    if (infos.length > 0) {
      result = result.concat(infos[0].application);
    }

    result = result.filter((item) => {
      return item.name !== "default.application";
    });

    result.push({
      name: "default.application",
      type: "rawManifest",
    });

    return result;
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

    fs.writeFileSync(filePath, writeData);
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
