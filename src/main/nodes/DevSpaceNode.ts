import { difference } from "lodash";
import * as vscode from "vscode";
import { ClusterSource } from "../common/define";
import * as nhctl from "../ctl/nhctl";
import { IDevSpaceInfo, IRootNode, IV2ApplicationInfo } from "../domain";
import state from "../state";
import { resolveVSCodeUri } from "../utils/fileUtil";
import { NocalhostFolderNode } from "./abstract/NocalhostFolderNode";
import { AppNode } from "./AppNode";
import { ConfigurationFolderNode } from "./configurations/ConfigurationFolderNode";
import { RefreshData } from "./impl/updateData";
import { NodeType } from "./interfact";
import { KubeConfigNode } from "./KubeConfigNode";
import { NetworkFolderNode } from "./networks/NetworkFolderNode";
import { ID_SPLIT } from "./nodeContants";
import { StorageFolder } from "./storage/StorageFolder";
import { BaseNocalhostNode } from "./types/nodeType";
import { WorkloadFolderNode } from "./workloads/WorkloadFolderNode";

export function getDevSpaceLabel(info: IDevSpaceInfo) {
  let { spaceName: label, namespace } = info;

  if (label && namespace !== label) {
    label += `(${namespace})`;
  }

  return label || namespace;
}
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
    info: IDevSpaceInfo,
    applications: Array<IV2ApplicationInfo>,
    clusterSource: ClusterSource
  ) {
    super();
    this.hasInit = false;
    this.parent = parent;
    this.info = info;
    this.applications = applications;
    this.installedApps = [];
    this.clusterSource = clusterSource;

    this.label = getDevSpaceLabel(info);

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
    let data = [];

    if (!this.resetting()) {
      data = await this.getInstalledApp(
        this.info.namespace,
        this.getKubeConfigPath()
      );

      this.hasInit = true;
      this.installedApps = data;

      this.cleanDiffApp(data);
    }

    state.setData(this.getNodeStateId(), this.installedApps, isInit);

    return this.installedApps;
  }

  private cleanDiffApp(resources: nhctl.InstalledAppInfo[]) {
    const old = state.getData(
      this.getNodeStateId()
    ) as nhctl.InstalledAppInfo[];

    if (old && old.length && resources.length) {
      const diff: string[] = difference(
        old.map((item) => this.getAppNode(item).getNodeStateId()),
        resources.map((item) => this.getAppNode(item).getNodeStateId())
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
  resetting(): boolean {
    return !!state.getAppState(this.getNodeStateId(), "resetting");
  }
  getAppNode(item: nhctl.InstalledAppInfo) {
    let app = this.getApplication(item.name);
    if (!app) {
      app = this.buildApplicationInfo(item.name);
    }
    return this.buildAppNode(app);
  }

  async getChildren(parent?: BaseNocalhostNode): Promise<BaseNocalhostNode[]> {
    let data = state.getData(this.getNodeStateId()) as nhctl.InstalledAppInfo[];

    if (!data) {
      data = await this.updateData(true);
    }

    // updateData
    // TODO: DISPLAY LOCAL APP NOT FILTER
    const nodes = data.map(this.getAppNode.bind(this));

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
    if (this.resetting()) {
      treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
      treeItem.iconPath = resolveVSCodeUri("loading.gif");
    } else {
      const iconName =
        this.info.isAsleep === "asleep"
          ? "namespace_sleep.svg"
          : this.info.spaceOwnType === "Viewer"
          ? "devspace_viewer.svg"
          : "devspace.svg";
      treeItem.iconPath = resolveVSCodeUri(iconName);
    }

    treeItem.contextValue = this.getSpaceOwnTypeContextValue(
      `devspace-${
        this.clusterSource === ClusterSource.local
          ? "local"
          : this.info.isAsleep === "asleep"
          ? "server-sleeping"
          : this.info.isAsleep === "wakeup"
          ? "server-unsleeping"
          : "server"
      }`
    );

    if ("rootNode" in this.parent) {
      const { rootNode } = (this.parent as unknown) as { rootNode: IRootNode };

      if (
        rootNode.clusterSource === ClusterSource.server &&
        rootNode.serviceAccount.kubeconfigType === "vcluster"
      ) {
        treeItem.contextValue += "-vcluster";
      }
    }

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

  getSpaceOwnTypeContextValue(val: string) {
    let contextValue = "";
    if (this.info?.spaceOwnType === "Viewer") {
      contextValue = "viewer:";
    }

    return contextValue + val;
  }
}
