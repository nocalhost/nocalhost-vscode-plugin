import * as vscode from 'vscode';
import * as kubectl from './ctl/kubectl';
import * as nhctl from './ctl/nhctl';
import * as shell from './ctl/shell';
import host from './host';

export default class NocalhostDocumentProvider implements vscode.TextDocumentContentProvider {
  static supportScheme = ['Nocalhost'];
  static supportAuthority = ['k8s','nh'];
  onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  onDidChange = this.onDidChangeEmitter.event;
  
  async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken) {
    /**
     *   foo://example.com:8042/over/there?name=ferret#nose
          \_/   \______________/\_________/ \_________/ \__/
          |           |            |            |        |
        scheme     authority       path        query   fragment
          |   _____________________|__
          / \ /                        \
          urn:example:animal:ferret:nose

        Nocalhost://k8s/loadResource/deployments/name
     */
    let result: vscode.ProviderResult<string>;

    this.checkSchema(uri);

    const authority = uri.authority;

    switch (authority) {
      case 'k8s': {
        const paths = uri.path.split('/');
        const type = paths[1];
        if (type === 'loadResource') {
          const kind = paths[2];
          const names = paths[3].split('.');
          const name = names[0];
          const output = names[1];
          result = await kubectl.loadResource(host, kind, name, output);
        } else if(type === 'log') {
          // Nocalhost://k8s/log/pod/container
          const podName = paths[2];
          const constainerName = paths[3];
          const shellObj = await shell.execAsync(`kubectl logs ${podName} -c ${constainerName}`, []);
          if (shellObj.code === 0) {
            result = shellObj.stdout;
          } else {
            result = shellObj.stderr;
          }
        }
        break;
      }
        
      case 'nh': {
        const paths = uri.path.split('/');
        const names = paths[1].split('.');
        const name = names[0];
        result = await nhctl.loadResource(host, name);
        break;
      }
      default:
        
    }


    return result;
  }

  private checkSchema(uri: vscode.Uri) {
    const authority = uri.authority;

    if (!NocalhostDocumentProvider.supportScheme.includes(uri.scheme)) {
      throw new Error(`only support scheme: ${NocalhostDocumentProvider.supportScheme}`);
    }

    if (!NocalhostDocumentProvider.supportAuthority.includes(authority)) {
      throw new Error(`only support authority: ${NocalhostDocumentProvider.supportAuthority}`);
    }
  }
}