import * as path from "path";
import * as vscode from "vscode";
import { getApplication } from "../api";
import { KUBE_CONFIG_DIR, HELM_NH_CONFIG_DIR, USERINFO } from "../constants";
import { AppNode } from "./AppNode";
import { NocalhostAccountNode } from "./NocalhostAccountNode";
import { ROOT } from "./nodeContants";
import { BaseNocalhostNode } from "./types/nodeType";
import * as fileUtil from "../utils/fileUtil";
import * as fileStore from "../store/fileStore";
import DataCenter from "../common/DataCenter";

export class NocalhostRootNode implements BaseNocalhostNode {
  private static childNodes: Array<AppNode | NocalhostAccountNode> = [];
  public static getChildNodes(): Array<AppNode | NocalhostAccountNode> {
    return NocalhostRootNode.childNodes;
  }

  public label: string = "Nocalhost";
  public type = ROOT;
  constructor(public parent: BaseNocalhostNode | null) {}

  getParent(element: BaseNocalhostNode): BaseNocalhostNode | null | undefined {
    return;
  }

  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<Array<AppNode | NocalhostAccountNode>> {
    DataCenter.getInstance().setApplications();

    const res = await getApplication();
    let all: Array<Promise<any>> = [];
    NocalhostRootNode.childNodes = res.map((app) => {
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
      const filePath = path.resolve(
        KUBE_CONFIG_DIR,
        `${app.id}_${app.devspaceId}_config`
      );
      all.push(fileUtil.writeFile(filePath, app.kubeconfig));

      const nhConfigPath = path.resolve(
        HELM_NH_CONFIG_DIR,
        `${app.id}_${app.devspaceId}_config`
      );
      fileUtil.writeFile(nhConfigPath, obj.nocalhostConfig || "");
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

    await Promise.all(all);

    const userinfo = fileStore.get(USERINFO);

    const hasAccountNode: boolean = NocalhostRootNode.childNodes.some(
      (node: AppNode | NocalhostAccountNode) => {
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
      vscode.TreeItemCollapsibleState.Expanded
    );
    return treeItem;
  }

  getNodeStateId(): string {
    return "Nocalhost";
  }
}
