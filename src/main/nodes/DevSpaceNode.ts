import { difference } from "lodash";
import * as vscode from "vscode";
import { ClusterSource } from "../common/define";
import * as nhctl from "../ctl/nhctl";
import { IDevSpaceInfo, IV2ApplicationInfo } from "../domain";
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

export class DevSpaceNode extends NocalhostFolderNode implements RefreshData {
  public label: string;
  public type = NodeType.devSpace;
  public hasInit: boolean;

  constructor(
    public parent: BaseNocalhostNode,
    label: string,
    public info: IDevSpaceInfo,
    public clusterSource: ClusterSource
  ) {
    super();
    this.hasInit = false;

    if (label && info.namespace !== label) {
      label += `(${info.namespace})`;
    }
    this.label = label || info.namespace;

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

  public getKubeConfigPath() {
    const node = this.getParent() as KubeConfigNode;

    return node.kubeConfigPath;
  }

  public async updateData(isInit?: boolean): Promise<any> {
    let data: nhctl.InstalledAppInfo[] = [];

    if (!this.resetting()) {
      data = await this.getInstalledApp(
        this.info.namespace,
        this.getKubeConfigPath()
      );

      this.hasInit = true;

      this.cleanDiffApp(data);
    }

    state.setData(this.getNodeStateId(), data, isInit);

    return data;
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
    let app = this.buildApplicationInfo(item.name);
    return this.buildAppNode(app);
  }

  async getChildren(parent?: BaseNocalhostNode): Promise<BaseNocalhostNode[]> {
    let data = state.getData(this.getNodeStateId()) as nhctl.InstalledAppInfo[];

    if (!data) {
      data = await this.updateData(true);
    }

    const nodes = data.map(this.getAppNode.bind(this));

    const result = nodes.filter((node) => {
      return node instanceof AppNode;
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
        this.info.spaceOwnType === "Viewer"
          ? "devspace_viewer.svg"
          : "devspace.svg";
      treeItem.iconPath = resolveVSCodeUri(iconName);
    }

    treeItem.contextValue = this.getSpaceOwnTypeContextValue(
      `devspace-${
        this.clusterSource === ClusterSource.local ? "local" : "server"
      }`
    );

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
