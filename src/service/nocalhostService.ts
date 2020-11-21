import * as nhctl from '../ctl/nhctl';
import * as kubectl from '../ctl/kubectl';
import * as shell from '../ctl/shell';
import git from '../ctl/git';
import { Host } from '../host';
import * as fileUtil from '../utils/fileUtil';
import * as path from 'path';
import * as os from 'os';

import * as vscode from 'vscode';

import { updateAppInstallStatus } from '../api';
import { PodResource, Resource } from '../nodes/resourceType';
import state from '../state';
import { CURRENT_KUBECONFIG_FULLPATH, KUBE_CONFIG_DIR, SELECTED_APP_ID } from '../constants';
import  * as fileStore from '../store/fileStore';

interface NocalhostConfig {
  preInstalls: Array<{
    path: string;
    weight?: string | number;
  }>;
  appConfig: {
    name: string;
    type: string;
    resourcePath: string;
  };
  svcConfigs: Array<{
    name: string;
    type: string;
    gitUrl: string;
    devLang: string; // # java|go|node|php
    devImage: string;
    workDir: string;
    localWorkDir: string;
    sync: Array<string>;
    ignore: Array<string>;
    sshPort: {
      localPort: number;
      sshPort: number;
    };
    devPort: Array<string>;
    command: Array<string>;
    jobs: Array<string>;
    pods: Array<string>;
  }>
}

const NHCTL_DIR = path.resolve(os.homedir(), '.nhctl');

class NocalhostService {

  private async cloneAppAllSource(host: Host, appName: string) {
    const isClone = await host.showInformationMessage('Do you want to clone the code?', 'confirm', 'cancel');
    if (isClone === 'cancel') {
      return;
    }
    host.log('start clone source ...', true);
    const configPath = path.resolve(NHCTL_DIR, 'application', appName, '.nocalhost' , 'config.yaml');
    const config = (await fileUtil.readYaml(configPath)) as NocalhostConfig;
    const dir = await host.showSelectFolderDialog('please select directory of saving source code');
    let dirPath: string;
    if (dir) {
      dirPath = (dir as vscode.Uri[])[0].fsPath;
      // replace localWorkDir
      config.svcConfigs.map((item) => {
        item.localWorkDir = path.resolve(dirPath, item.name);
        item.sync = [path.resolve(dirPath, item.name)];
      });
      await fileUtil.writeYaml(configPath, config);
    }
    const arr = config.svcConfigs;
    for (let i = 0; i < arr.length; i++) {
      const { gitUrl, localWorkDir } = arr[i];
      if (gitUrl) {
        const isExist = await fileUtil.isExist(localWorkDir);
        if (isExist) {
          continue;
        }
        await git.clone(host, gitUrl, [localWorkDir]);
      }
    }
    host.log('end clone source', true);
  }
  async install(host: Host, appId: number, devSpaceId: number, gitUrl: string) {
    host.log('installing app ...', true);
    host.showInformationMessage('replacing image ...');
    await nhctl.install(host, `${appId}`, gitUrl);
    await updateAppInstallStatus(appId, devSpaceId, 1);
    await this.cloneAppAllSource(host, `${appId}`);
    host.log('installed app', true);

    vscode.commands.executeCommand('refreshApplication');
  }

  async log(host: Host, appId: number, type: string, workloadName: string) {
    const resArr = await kubectl.getControllerPod(host, type, workloadName);
    if (resArr && resArr.length <= 0) {
      host.showErrorMessage('Not found pod');
      return;
    }
    const podNameArr = (resArr as Array<Resource>).map((res) => {
      return res.metadata.name;
    });
    let podName: string | undefined = podNameArr[0];
    if (podNameArr.length > 1) {
      podName = await vscode.window.showQuickPick(podNameArr);
    }
    if (!podName) {
      return;
    }
    const podStr = await kubectl.loadResource(host, 'pod', podName, 'json');
    const pod = JSON.parse(podStr as string) as PodResource;
    const containerNameArr = pod.spec.containers.map((c) => {
      return c.name;
    });
    let containerName: string | undefined = containerNameArr[0];
    if (containerNameArr.length > 1) {
      containerName = await vscode.window.showQuickPick(containerNameArr);
    }
    if(!containerName) {
      return;
    }

    const uri = vscode.Uri.parse(`Nocalhost://k8s/log/${podName}/${containerName}`);
    let doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, { preview: false });
  }

  async uninstall(host:Host, appId: number, devSpaceId: number) {
    host.log('uninstalling app ...', true);
    host.showInformationMessage('uninstalling app ...');
    await nhctl.uninstall(host, `${appId}`);
    await updateAppInstallStatus(appId, devSpaceId, 0);
    host.log('uninstalled app', true);
    host.showInformationMessage('uninstalled app ...');

    vscode.commands.executeCommand('refreshApplication');
  }

  async startDebug(host: Host, appName: string, type: string, workloadName: string) {
    host.log('replace image ...', true);
    host.showInformationMessage('replacing image ...');
    await nhctl.replaceImage(host, appName, workloadName);
    host.log('replace image end', true);
    host.log('', true);
  
    host.log('port forward ...', true);
    host.showInformationMessage('port forwarding ...');
    const portForwardDispose = await nhctl.startPortForward(host, appName, workloadName);
    host.pushDebugDispose(portForwardDispose);
    host.log('port forward end', true);
    host.log('', true);
  
    host.log('sync file ...', true);
    host.showInformationMessage('sysc file ...');
    await nhctl.syncFile(host, appName, workloadName);
    host.log('sync file end', true);
    host.log('', true);

    // record debug state
    state.set(`${appName}_${workloadName}_debug`, true);

    await this.exec(host, appName, type, workloadName);

    const isGo = await host.showInformationMessage('go to open source code ' + '', 'GO');
    if (isGo === 'GO') {
      const nocalhostConfig = await this.getNocalhostConfig();
      let dir = '';
      nocalhostConfig.svcConfigs.forEach(conf => {
        if (conf.name === workloadName) {
          dir = conf.localWorkDir;
          return;
        }
      });
      if (dir) {
        shell.execAsync(host, `code ${dir}`, false);
      } else {
        host.showErrorMessage('Not found the source code');
      }
    }
  }

  private async getNocalhostConfig() {
    const appId = fileStore.get(SELECTED_APP_ID);;
    const configPath = path.resolve(NHCTL_DIR, 'application', `${appId}`, '.nocalhost' , 'config.yaml');
    const config = (await fileUtil.readYaml(configPath)) as NocalhostConfig;

    return config;
  }

  async endDebug(host: Host, appName: string, workLoadName: string) {
    host.showInformationMessage('ending Debug ...');
    host.log('ending Debug ...', true);
    await nhctl.endDebug(host, appName, workLoadName);
    host.showInformationMessage('ended Debug');
    host.log('ended Debug', true);
    state.delete(`${appName}_${workLoadName}_debug`);
  }

  async exec(host: Host, appName: string, type: string, workloadName: string) {
    const isDebug = state.get(`${appName}_${workloadName}_debug`);
    if (isDebug) {
      await this.openDebugExec(host, type, workloadName);
    } else {
      await this.openExec(host, type, workloadName);
    }
  }

  async openDebugExec(host: Host, type: string, workloadName: string) {
    host.log('open container ...', true);
    host.showInformationMessage('open container ...');
    const resArr = await kubectl.getControllerPod(host, type, workloadName);
    if (resArr && resArr.length <= 0) {
      host.showErrorMessage('Not found pod');
      return;
    }
    const podName = (resArr as Array<Resource>)[0].metadata.name;
    const kubeconfigPath = fileStore.get(CURRENT_KUBECONFIG_FULLPATH);
    const command = `kubectl exec -it ${podName} -c nocalhost-dev --kubeconfig ${kubeconfigPath} -- /bin/sh`;
    const terminalDisposed = host.invokeInNewTerminal(command);
    host.pushDebugDispose(terminalDisposed);
    host.log('open container end', true);
    host.log('', true);
  }

  /**
   * exec
   * @param host 
   * @param type 
   * @param workloadName 
   */
  async openExec(host: Host, type: string, workloadName: string) {
    host.log('open container ...', true);
    host.showInformationMessage('open container ...');
    const resArr = await kubectl.getControllerPod(host, type, workloadName);
    if (resArr && resArr.length <= 0) {
      host.showErrorMessage('Not found pod');
      return;
    }
    const podNameArr = (resArr as Array<Resource>).map((res) => {
      return res.metadata.name;
    });
    let podName: string | undefined = podNameArr[0];
    if (podNameArr.length > 1) {
      podName = await vscode.window.showQuickPick(podNameArr);
    }
    if (!podName) {
      return;
    }
    const podStr = await kubectl.loadResource(host, 'pod', podName, 'json');
    const pod = JSON.parse(podStr as string) as PodResource;
    const containerNameArr = pod.spec.containers.map((c) => {
      return c.name;
    });
    let containerName: string | undefined = containerNameArr[0];
    if (containerNameArr.length > 1) {
      containerName = await vscode.window.showQuickPick(containerNameArr);
    }
    if(!containerName) {
      return;
    }
    const kubeconfigPath = fileStore.get(CURRENT_KUBECONFIG_FULLPATH);
    const command = `kubectl exec -it ${podName} -c ${containerName} --kubeconfig ${kubeconfigPath} -- /bin/sh`;
    const terminalDisposed = host.invokeInNewTerminal(command);
    host.pushDebugDispose(terminalDisposed);
    host.log('open container end', true);
    host.log('', true);
  }

  async portForward(host: Host, type: string, workloadName: string) {
    const resArr = await kubectl.getControllerPod(host, type, workloadName);
    if (resArr && resArr.length <= 0) {
      host.showErrorMessage('Not found pod');
      return;
    }
    const podNameArr = (resArr as Array<Resource>).map((res) => {
      return res.metadata.name;
    });
    let podName: string | undefined = podNameArr[0];
    if (podNameArr.length > 1) {
      podName = await vscode.window.showQuickPick(podNameArr);
    }
    if (!podName) {
      return;
    }
    let portMap: string|undefined = "";
    portMap = await vscode.window.showInputBox({placeHolder: 'eg: 1234:1234'});
    if (!portMap) {
      return;
    }
    // kubeconfig
    const kubeconfigPath = fileStore.get(CURRENT_KUBECONFIG_FULLPATH);
    const command = `kubectl port-forward ${podName} ${portMap} --kubeconfig ${kubeconfigPath}`;
    const terminalDisposed = host.invokeInNewTerminal(command);
    host.pushDebugDispose(terminalDisposed);
    host.log('open container end', true);
    host.log('', true);
  }
}

export default new NocalhostService();