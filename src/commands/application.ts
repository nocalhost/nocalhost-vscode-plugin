import * as vscode from 'vscode';
import NocalhostTreeProvider, { AppNode } from '../appProvider';
import * as api from '../api';
import { CURRENT_KUBECONFIG_FULLPATH, KUBE_CONFIG_DIR, SELECTED_APP_ID } from '../constants';
import * as fs from 'fs';
import * as path from 'path';
import * as fileStore from '../store/fileStore';

class Application {
  public async getApplicationList() {
    // 更新 tree-provider
    
    // return Promise.resolve(['app1', 'app2']);
  }

  // TODO: switch default kubeConfig file
  public switchCurrentKubeConfig() {

  }

  // get kubeconfig of app
  public async getKubeConfig() {
    const kubeInfo = await api.getKubeConfig(SELECTED_APP_ID);
    // save kubeconfig {userId_clusterId_appId_config} TODO: current only one kubeconfig
    const selectId = fileStore.get(SELECTED_APP_ID);
    const currentKubeConfigFullpath = path.resolve(KUBE_CONFIG_DIR, `${kubeInfo.user_id}_${kubeInfo.cluster_id}_${selectId}_config`);
    fs.writeFileSync(currentKubeConfigFullpath, kubeInfo.kubeconfig);
    // set current kubeConfig fullpath
    fileStore.set(CURRENT_KUBECONFIG_FULLPATH, currentKubeConfigFullpath);
  }

  public async useApplication(appNode: AppNode) {
    fileStore.set(SELECTED_APP_ID, appNode.id);
    await this.getKubeConfig();
    vscode.commands.executeCommand('refreshApplication');
  }

  public deployApplication(appNode: AppNode) {
    // exec("ss", '')
  }
}

export default new Application();