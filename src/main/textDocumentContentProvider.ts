import vscode from "vscode";
import querystring from "querystring";
import services, { ServiceResult } from "./common/DataCenter/services/index";
import host from "./host";

let instance: TextDocumentContentProvider | null = null;

export default class TextDocumentContentProvider
  implements vscode.TextDocumentContentProvider, vscode.Disposable
{
  public static getInstance(): TextDocumentContentProvider {
    if (!instance) {
      instance = new TextDocumentContentProvider();
    }
    return instance;
  }

  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

  get onDidChange(): vscode.Event<vscode.Uri> {
    return this._onDidChange.event;
  }

  dispose(): void {
    this._onDidChange.dispose();
  }

  update(uri: vscode.Uri): void {
    this._onDidChange.fire(uri);
  }

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const authority: string = uri.authority;
    const query: string = uri.query;
    let content: string = "";
    if (authority === "editManifest") {
      const queryObj: querystring.ParsedUrlQuery = querystring.parse(query);
      const type: string = queryObj.type as string;
      const kind: string = queryObj.kind as string;
      const name: string = queryObj.name as string;
      const kubeConfig: string = queryObj.kubeConfigPath as string;
      switch (type) {
        case "k8s": {
          const result: ServiceResult = await services.fetchKubernetesResource(
            kind,
            name,
            kubeConfig
          );
          if (!result.success) {
            host.showErrorMessage(result.value);
          } else {
            content = result.value;
          }
          break;
        }
        default: {
          break;
        }
      }
    }
    return content;
  }
}
