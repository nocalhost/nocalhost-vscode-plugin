import * as vscode from "vscode";
import {
  CURRENT_KUBECONFIG_FULLPATH,
  KUBE_CONFIG_DIR,
  SELECTED_APP_NAME,
} from "../constants";
import * as fs from "fs";
import * as path from "path";
import * as fileStore from "../store/fileStore";
import { AppFolderNode } from "../nodes/nodeType";

class Application {
  private cache = new Map<string, string>();

  private writeToDisk(filepath: string, kubeConfig: string): void {
    fs.writeFile(filepath, kubeConfig, (err) => {
      if (err) {
        return vscode.window.showErrorMessage(
          `Fail to write file: ${filepath}`
        );
      }
      this.cache.set(filepath, kubeConfig);
    });
  }

  private resolveKubeConfigPath(id: number, devSpaceId: number): string {
    return path.resolve(KUBE_CONFIG_DIR, `${id}_${devSpaceId}_config`);
  }

  private getKubeConfigPath(appNode: AppFolderNode): string {
    const { id, devSpaceId } = appNode;
    return this.resolveKubeConfigPath(id, devSpaceId);
  }

  // get kubeconfig of app
  public saveKubeConfig(
    id: number,
    devSpaceId: number,
    kubeConfig: string
  ): void {
    const filepath = this.resolveKubeConfigPath(id, devSpaceId);
    if (this.cache.has(filepath) && this.cache.get(filepath) === kubeConfig) {
      return;
    }
    this.writeToDisk(filepath, kubeConfig);
  }

  public async useApplication(appNode: AppFolderNode): Promise<void> {
    const currentKubeConfigFullpath = this.getKubeConfigPath(appNode);
    fileStore.set(SELECTED_APP_NAME, appNode.info.name);
    fileStore.set(CURRENT_KUBECONFIG_FULLPATH, currentKubeConfigFullpath);
    vscode.commands.executeCommand("Nocalhost.refresh");
  }
}

export default new Application();
