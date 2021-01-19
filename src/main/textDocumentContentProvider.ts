import * as vscode from "vscode";
import * as querystring from "querystring";
import services from "./common/DataCenter/services/index";

let instance: TextDocumentContentProvider | null = null;

export default class TextDocumentContentProvider
  implements vscode.TextDocumentContentProvider, vscode.Disposable {
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
    if (authority === "loadresource") {
      const queryObj: querystring.ParsedUrlQuery = querystring.parse(query);
      const type: string = queryObj.type as string;
      const kind: string = queryObj.kind as string;
      const name: string = queryObj.name as string;
      const kubeConfig: string = queryObj.kubeConfig as string;
      switch (type) {
        case "k8s": {
          content = await services.fetchK8SResource(kind, name, kubeConfig);
          break;
        }
        case "nh": {
          content = await services.fetchNHResource(name);
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
