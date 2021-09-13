import { existsSync } from 'fs';
import * as vscode from 'vscode';
import { getServiceConfig } from '../ctl/nhctl';
import host from '../host';
import { OPEN_PROJECT, ASSOCIATE_LOCAL_DIRECTORY } from './constants';
import ICommand from './ICommand';
import registerCommand from './register';
import { ControllerNodeApi } from './StartDevModeCommand';
import { getContainer } from '../utils/getContainer';
import { NhctlCommand } from './../ctl/nhctl';
import { INhCtlGetResult } from '../domain';

export default class OpenProjectCommand implements ICommand {
  command: string = OPEN_PROJECT;
  context: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    registerCommand(context, this.command, true, this.execCommand.bind(this));
  }

  async execCommand(node: ControllerNodeApi) {
    if (!node) {
      host.showWarnMessage('Failed to get node configs, please try again.');
      return;
    }
    const status = await node.getStatus();
    if (status !== 'developing') {
      return;
    }

    const resource: INhCtlGetResult = await NhctlCommand.get({
      kubeConfigPath: node.getKubeConfigPath(),
      namespace: node.getNameSpace(),
    })
      .addArgumentStrict(node.resourceType, node.name)
      .addArgument('-a', node.getAppName())
      .addArgument('-o', 'json')
      .exec();
    const containerName =
      (await node.getContainer()) || (await getContainer(resource.info));
    host.log(`[open project] Container: ${containerName}`, true);

    const kubeConfigPath = node.getKubeConfigPath();
    const namespace = node.getNameSpace();
    const appName = node.getAppName();

    const profile = await getServiceConfig(
      kubeConfigPath,
      namespace,
      appName,
      node.name,
      node.resourceType
    );

    if (profile.associate) {
      if (!existsSync(profile.associate)) {
        vscode.commands.executeCommand(ASSOCIATE_LOCAL_DIRECTORY, node, true);
        return;
      }
      const currentUri = host.getCurrentRootPath();

      const uri = vscode.Uri.file(profile.associate);

      if (currentUri !== uri.fsPath) {
        vscode.commands.executeCommand('vscode.openFolder', uri, true);
      }
    } else {
      vscode.commands.executeCommand(ASSOCIATE_LOCAL_DIRECTORY, node, true);
    }
  }
}
