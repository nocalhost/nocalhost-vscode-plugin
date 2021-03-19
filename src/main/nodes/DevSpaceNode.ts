import * as vscode from "vscode";
import { KUBE_CONFIG_DIR, HELM_NH_CONFIG_DIR } from "../constants";
import * as nhctl from "../ctl/nhctl";
import * as yaml from "yaml";
import state from "../state";

import { APP_FOLDER, ID_SPLIT } from "./nodeContants";
import { resolveVSCodeUri } from "../utils/fileUtil";
import * as path from "path";
import { BaseNocalhostNode, AppInfo } from "./types/nodeType";
import { NocalhostFolderNode } from "./abstract/NocalhostFolderNode";
import { NetworkFolderNode } from "./networks/NetworkFolderNode";
import { NocalhostRootNode } from "./NocalhostRootNode";
import { NocalhostAccountNode } from "./NocalhostAccountNode";
import { WorkloadFolderNode } from "./workloads/WorkloadFolderNode";
import { ConfigurationFolderNode } from "./configurations/ConfigurationFolderNode";
import { StorageFolder } from "./storage/StorageFolder";
import { ApplicationInfo, DevspaceInfo, V2ApplicationInfo } from "../api";
import { AppNode } from "./AppNode";
import * as _ from "lodash";

export class DevSpaceNode extends NocalhostFolderNode {
  public label: string;
  public type = "DEVSPACE";
  public info: DevspaceInfo;
  public applications: Array<V2ApplicationInfo>;
  public parent: NocalhostRootNode;
  public installedApps: {
    name: string;
    type: string;
  }[] = [];

  constructor(
    parent: NocalhostRootNode,
    label: string,
    info: DevspaceInfo,
    applications: Array<V2ApplicationInfo>,
    installedApps: {
      name: string;
      type: string;
    }[]
  ) {
    super();
    this.parent = parent;
    this.label = label || info.namespace;
    this.info = info;
    this.applications = applications;
    this.installedApps = installedApps;
    state.setNode(this.getNodeStateId(), this);
  }

  public generateInstallType(source: string, originInstallType: string) {
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

  public buildAppNode(app: V2ApplicationInfo) {
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

    const label =
      (obj.name === "default.application" ? "default" : obj.name) ||
      `app_${app.id}`;

    const appNode = new AppNode(
      this,
      obj.installType,
      obj.resourceDir,
      label,
      obj.appConfig || "",
      obj.nocalhostConfig || "",
      app.id,
      this.info.id,
      app.status,
      1,
      this.info.kubeconfig,
      app
    );

    return appNode;
  }

  public getUninstallApps() {
    const installedAppNames = this.installedApps.map((app) => app.name);
    installedAppNames.push("DEFAULT RESOURCE");
    const arr = this.applications.filter((a) => {
      const context = a.context;
      let jsonObj = JSON.parse(context);
      const appName = jsonObj["application_name"];
      if (installedAppNames.includes(appName)) {
        return false;
      } else {
        return true;
      }
    });

    return arr;
  }

  public getApplication(name: string) {
    const apps = this.applications.filter((item) => {
      const context = item.context;
      let jsonObj = JSON.parse(context);
      const appName = jsonObj["application_name"];
      if (appName === name) {
        return true;
      }
    });

    return apps[0];
  }

  public getKubeConfigPath() {
    const kubeconfigPath = path.resolve(
      KUBE_CONFIG_DIR,
      `${this.info.id}_config`
    );

    return path.normalize(kubeconfigPath);
  }

  async getChildren(parent?: BaseNocalhostNode): Promise<BaseNocalhostNode[]> {
    let data = this.installedApps;

    const nodes = data.map((item) => {
      const app = this.getApplication(item.name);
      if (!app) {
        return null;
      }
      return this.buildAppNode(app);
    });

    const result = nodes.filter((node) => {
      if (node instanceof AppNode) {
        return true;
      }
    });
    return result as AppNode[];
  }

  async getTreeItem() {
    let treeItem = new vscode.TreeItem(
      this.label,
      vscode.TreeItemCollapsibleState.Collapsed
    );

    treeItem.contextValue = "devspace";

    return Promise.resolve(treeItem);
  }

  getNodeStateId(): string {
    return `${this.parent.getNodeStateId()}${ID_SPLIT}${this.label}`;
  }

  getParent(): NocalhostRootNode {
    return this.parent;
  }

  createChild(type: string) {
    let node: BaseNocalhostNode;
    switch (type) {
      case "Workloads":
        node = new WorkloadFolderNode(this);
        break;
      case "Networks":
        node = new NetworkFolderNode(this);
        break;
      case "Configurations":
        node = new ConfigurationFolderNode(this);
        break;
      case "storage":
        node = new StorageFolder(this);
        break;
      default:
        throw new Error("not implement the resource");
    }
    return node;
  }
}
