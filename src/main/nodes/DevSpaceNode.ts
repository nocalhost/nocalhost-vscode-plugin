import * as vscode from "vscode";

import * as nhctl from "../ctl/nhctl";
import state from "../state";
import { ClusterSource } from "../common/define";
import { ID_SPLIT } from "./nodeContants";
import { BaseNocalhostNode } from "./types/nodeType";
import { NocalhostFolderNode } from "./abstract/NocalhostFolderNode";
import { NetworkFolderNode } from "./networks/NetworkFolderNode";
import { WorkloadFolderNode } from "./workloads/WorkloadFolderNode";
import { ConfigurationFolderNode } from "./configurations/ConfigurationFolderNode";
import { StorageFolder } from "./storage/StorageFolder";
import { IDevSpaceInfo, IV2ApplicationInfo } from "../domain";
import { AppNode } from "./AppNode";
import { RefreshData } from "./impl/updateData";
import { KubeConfigNode } from "./KubeConfigNode";
import { NodeType } from "./interfact";
import { resolveVSCodeUri } from "../utils/fileUtil";

import arrayDiffer = require("array-differ");

export class DevSpaceNode extends NocalhostFolderNode implements RefreshData {
  public label: string;
  public type = NodeType.devSpace;
  public info: IDevSpaceInfo;
  public hasInit: boolean;
  public clusterSource: ClusterSource;
  public applications: Array<IV2ApplicationInfo>;
  public parent: BaseNocalhostNode;
  public installedApps: {
    name: string;
    type: string;
  }[] = [];

  constructor(
    parent: BaseNocalhostNode,
    label: string,
    info: IDevSpaceInfo,
    applications: Array<IV2ApplicationInfo>,
    clusterSource: ClusterSource
  ) {
    super();
    this.hasInit = false;
    this.parent = parent;
    this.label = label || info.namespace;
    this.info = info;
    this.applications = applications;
    this.installedApps = [];
    this.clusterSource = clusterSource;
    state.setNode(this.getNodeStateId(), this);
  }

  public buildAppNode(app: IV2ApplicationInfo) {
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
      obj.installType = jsonObj["installType"];
      obj.resourceDir = jsonObj["resourceDir"];
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
    // installedAppNames.push("DEFAULT RESOURCE");
    installedAppNames.push("default.application");
    const arr = this.applications.filter((a) => {
      const context = a.context;
      let jsonObj = JSON.parse(context);
      const appName = jsonObj["applicationName"];
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
      const appName = jsonObj["applicationName"];
      if (appName === name) {
        return true;
      }
    });

    return apps[0];
  }

  public getKubeConfigPath() {
    const node = this.getParent() as KubeConfigNode;

    return node.getKubeConfigPath();
  }

  public async updateData(isInit?: boolean): Promise<any> {
    if (this.unInstalling()) {
      return [];
    }

    this.installedApps = await this.getInstalledApp(
      this.info.namespace,
      this.getKubeConfigPath()
    );
    this.hasInit = true;

    await this.cleanDiffApp();

    state.setData(this.getNodeStateId(), this.installedApps, isInit);
    return this.installedApps;
  }

  private async cleanDiffApp() {
    if (state.getData(this.getNodeStateId())) {
      const children = await this.getChildren();

      if (children.length) {
        const diff: string[] = arrayDiffer(
          children.map((item) => item.label),
          ["default"],
          this.installedApps.map((item) => item.name)
        );

        if (diff.length) {
          diff.forEach((name) => {
            const node = children.find((item) => item.label === name);
            node && state.cleanAutoRefresh(node);
          });
        }
      }
    }
  }

  private async getInstalledApp(namespace: string, kubeconfigPath: string) {
    const infos = await nhctl.getInstalledApp(namespace, kubeconfigPath);
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
  unInstalling(): boolean {
    return !!state.getAppState(this.info.spaceName, "uninstalling");
  }
  async getChildren(parent?: BaseNocalhostNode): Promise<BaseNocalhostNode[]> {
    let data = state.getData(this.getNodeStateId()) as nhctl.InstalledAppInfo[];

    if (!data) {
      data = await this.updateData(true);
    }

    // updateData
    // TODO: DISPLAY LOCAL APP NOT FILTER
    const nodes = data.map((item) => {
      let app = this.getApplication(item.name);
      if (!app) {
        app = this.buildApplicationInfo(item.name);
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

  buildApplicationInfo(appName: string, context: object = {}) {
    const contextObj = {
      applicationName: appName,
      applicationUrl: "",
      applicationConfigPath: "",
      nocalhostConfig: "",
      source: "",
      resourceDir: "",
      installType: "",
      ...context,
    };

    const app = {
      id: 0,
      userId: 0,
      public: 1,
      editable: 1,
      context: JSON.stringify(contextObj),
      status: 1,
    };

    return app;
  }

  async getTreeItem() {
    let treeItem = new vscode.TreeItem(
      this.label,
      vscode.TreeItemCollapsibleState.Collapsed
    );
    if (this.unInstalling()) {
      treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
      treeItem.iconPath = resolveVSCodeUri("loading.svg");
    }

    treeItem.contextValue = `devspace-${
      this.clusterSource === ClusterSource.local ? "local" : "server"
    }`;

    return Promise.resolve(treeItem);
  }

  getNodeStateId(): string {
    return `${this.parent.getNodeStateId()}${ID_SPLIT}${this.label}`;
  }

  getParent(): BaseNocalhostNode {
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
