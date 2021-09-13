import * as vscode from 'vscode';
import * as os from 'os';

import ICommand from './ICommand';
import { ASSOCIATE_LOCAL_DIRECTORY } from './constants';
import registerCommand from './register';
import { Deployment } from '../nodes/workloads/controllerResources/deployment/Deployment';
import host from '../host';
import { associate, getServiceConfig, NhctlCommand } from '../ctl/nhctl';
import { getContainer } from '../utils/getContainer';
import { INhCtlGetResult } from '../domain';

export default class AssociateLocalDirectoryCommand implements ICommand {
  command: string = ASSOCIATE_LOCAL_DIRECTORY;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: Deployment, container?: string) {
    if (!node) {
      host.showWarnMessage('Failed to get node configs, please try again.');
      return;
    }
    let appName: string, workloadName: string | undefined;
    appName = node.getAppName();
    workloadName = node.name;
    const namespace = node.getNameSpace();
    const kubeConfigPath = node.getKubeConfigPath();

    const status = await node.getStatus();
    if (status === 'developing' && !container) {
      host.showWarnMessage(
        'You are already in DevMode, please exit and try again'
      );
      return;
    }

    const profile = await getServiceConfig(
      node.getKubeConfigPath(),
      node.getNameSpace(),
      node.getAppName(),
      node.name,
      node.resourceType
    );

    const resource: INhCtlGetResult = await NhctlCommand.get({
      kubeConfigPath: node.getKubeConfigPath(),
      namespace: node.getNameSpace(),
    })
      .addArgumentStrict(node.resourceType, node.name)
      .addArgument('-a', node.getAppName())
      .addArgument('-o', 'json')
      .exec();

    const containerName =
      container ||
      (await node.getContainer()) ||
      (await getContainer(resource.info));

    const currentUri = host.getCurrentRootPath();

    const selectUri = await host.showSelectFolderDialog(
      'Associate local directory',
      vscode.Uri.file(profile.associate || currentUri || os.homedir())
    );
    if (selectUri && selectUri.length > 0) {
      await associate(
        kubeConfigPath,
        namespace,
        appName,
        selectUri[0].fsPath,
        node.resourceType,
        workloadName,
        containerName
      );
      if (container) {
        vscode.commands.executeCommand('vscode.openFolder', selectUri[0], true);
      } else {
        host.showInformationMessage('Directory successfully linked');
      }
    }
  }
}
