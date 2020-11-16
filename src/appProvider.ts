import * as vscode from 'vscode';
import * as path from 'path';

import { getApplication } from './api';

import nocalhostState from './state';
import * as providerResult from './providerResult';
import * as fileStore from './store/fileStore';
import { SELECTED_APP_ID } from './constants';

enum NodeType {
  nologin = 'NO_LOGIN',
  app = 'APP'
}

interface BaseNode {
  type: string;
  label: string;
  id?: number;
}

interface NologinNode extends BaseNode {
  type: NodeType.nologin;
}

export interface AppNode extends BaseNode {
  type: NodeType.app;
  info: {
    url: string;
    name: string;
  };
  status: number; // 
  deploy: boolean;
  select: boolean;
}

export type NocalhostNode = BaseNode | NologinNode | AppNode ; 

export default class NocalhostAppProvider implements vscode.TreeDataProvider<NocalhostNode> {
  private onDidChangeTreeDataEventEmitter = new vscode.EventEmitter<NocalhostNode | undefined>();
  onDidChangeTreeData = this.onDidChangeTreeDataEventEmitter.event;
  getTreeItem(element: NocalhostNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let item: vscode.TreeItem | Thenable<vscode.TreeItem>;
    switch(element.type) {
      case NodeType.nologin:
        item = {
          label: element.label,
          command: { command: 'showInputBox', title: 'showInputBox'},
        };
        break;
      case NodeType.app:
        const iconUrl = vscode.Uri.file(path.resolve(__dirname, "../images/running.svg"));
        const appNode = element as AppNode;
        item = {
          label: `${appNode.select?'* ':''}${appNode.label}`,
          contextValue: `app-${appNode.deploy ? 'deployed': 'notDeployed'}`
        };
        break;
      default:
        item = {
          label: element.label,
          command: { command: 'showInputBox', title: 'showInputBox'},
          collapsibleState: vscode.TreeItemCollapsibleState.None
        };
        break;
    }
    return item;
  }

  async getChildren(element?: BaseNode): Promise<NocalhostNode[]> {
    const isLogin = nocalhostState.isLogin();
    let baseResult: vscode.ProviderResult<NocalhostNode[]> = [];
    if (!isLogin) {
      let nologin: NologinNode = {
        type: NodeType.nologin,
        label: 'sign in nocalhost'
      };
      baseResult.push(nologin);
      
      return Promise.resolve(baseResult);
    }
    const datas = await getApplication().catch(err => {
      vscode.window.showErrorMessage(err.message);
    });
    let result: NocalhostNode[] | PromiseLike<NocalhostNode[]> = [];
    if (datas) {
      const selectAppId = fileStore.get(SELECTED_APP_ID);
      result = datas.map((appInfo, index) => {
        const status = fileStore.get(`app_${appInfo.id}_status`) || false;
        const isSelected = selectAppId === appInfo.id;
        const context = JSON.parse(appInfo.context);
        let app: AppNode = {
          type: NodeType.app,
          label: context.application_name,
          info: {
            name: context.application_name,
            url: context.application_url,
          },
          status: appInfo.status,
          id: appInfo.id,
          deploy: status,
          select: isSelected,
        };
  
        return app;
      });
    }

    return result;

  }

  refresh() {
    this.onDidChangeTreeDataEventEmitter.fire(undefined);
  }
}