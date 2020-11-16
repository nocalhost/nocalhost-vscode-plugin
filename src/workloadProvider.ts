import * as vscode from 'vscode';

import nocalhostState from './state';

import * as fileStore from './store/fileStore';
import { SELECTED_APP_ID } from './constants';
import { getResourceList } from './ctl/kubectl';
import { Host } from './host';

enum NodeType {
  deployment = 'Deployments',
  statefulSet = 'StatefulSets',
  job = 'Jobs',
  cronJob = 'Cronjobs',
  daemonSet = 'DaemonSets',
  folder = 'Folder'
}

export interface WorkloadNode {
  type: NodeType;
  label: string;
  status?: string;
  id?: number;
}

interface List {
  apiVersion: string,
  items: Array<Resource>,
  kind: string
}

interface Resource {
  apiVersion: string,
  items: [],
  kind: string,
  metadata: {
    name: string;
    [value: string]: string;
  }
}

export default class NocalhostAppProvider implements vscode.TreeDataProvider<WorkloadNode> {
  private onDidChangeTreeDataEventEmitter = new vscode.EventEmitter<WorkloadNode | undefined>();
  private host: Host;
  constructor(host: Host) {
    this.host = host;
  }
  onDidChangeTreeData = this.onDidChangeTreeDataEventEmitter.event;
  getTreeItem(element: WorkloadNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let item: vscode.TreeItem | Thenable<vscode.TreeItem>;
    switch(element.type) {
      case NodeType.folder:
        item = {
          label: element.label,
          command: { command: 'getWordloadList', title: element.label},
          collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        };
        break;
      default:
        item = {
          label: element.label,
          command: { command: 'loadResource', title: element.label},
          contextValue: 'debug'
        };
        break;
    }
    return item;
  }

  async getChildren(element?: WorkloadNode): Promise<WorkloadNode[]> {
    const isLogin = nocalhostState.isLogin();
    const selectId = fileStore.get(SELECTED_APP_ID);
    if (!isLogin || !selectId) {
      return [];
    }
    let result: vscode.ProviderResult<WorkloadNode[]> = [];
    
    if (!element) {
      const resources = ['Deployments', 'StatefulSets','DaemonSets', 'Jobs', 'Cronjobs'];
      result = resources.map((type) => {
        return {
          type: NodeType.folder,
          label: type
        };
      });

      return result;
    }

    const type = element.type;

    // get all resource
    if (type === NodeType.folder) {
      const str = await getResourceList(this.host, element.label);
      const list = JSON.parse(str as string) as List;
      result = list.items.map((item) => {
        return {
          label: item.metadata.name,
          type: element.label as NodeType,
        };
      });
    }

    return result;

  }

  refresh() {
    this.onDidChangeTreeDataEventEmitter.fire(undefined);
  }
}