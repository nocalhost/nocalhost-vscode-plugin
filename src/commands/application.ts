import * as vscode from "vscode";
import {
  CURRENT_KUBECONFIG_FULLPATH,
  KUBE_CONFIG_DIR,
  SELECTED_APP_NAME,
} from "../constants";
import * as fs from "fs";
import * as path from "path";
import * as fileStore from "../store/fileStore";
import { AppNode, AppSubFolderNode } from "../nodes/nodeType";

class Application {
  // get kubeconfig of app
  public async setKubeConfig(appNode: AppSubFolderNode) {
    const currentKubeConfigFullpath = path.resolve(
      KUBE_CONFIG_DIR,
      `${appNode.id}_${appNode.devSpaceId}_config`
    );
    fs.writeFileSync(currentKubeConfigFullpath, appNode.kubeConfig);
    fileStore.set(CURRENT_KUBECONFIG_FULLPATH, currentKubeConfigFullpath);
  }

  public async useApplication(appNode: AppSubFolderNode) {
    fileStore.set(SELECTED_APP_NAME, appNode.info.name);
    await this.setKubeConfig(appNode);
    vscode.commands.executeCommand("refreshApplication");
  }
}

export default new Application();
