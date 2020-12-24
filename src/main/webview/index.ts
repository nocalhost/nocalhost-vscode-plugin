import * as vscode from "vscode";
import MessageManager, { IMessage, MessageListener } from "./MessageManager";

let instance: NocalhostWebview | null = null;

class NocalhostWebview {
  private viewType: string = "nocalhostWebview";
  private context: vscode.ExtensionContext | null = null;
  private panel: vscode.WebviewPanel | null = null;
  private messageManager: MessageManager | null = null;

  private createWebviewPanel(): vscode.WebviewPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;
    const panel: vscode.WebviewPanel = vscode.window.createWebviewPanel(
      this.viewType,
      "",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
      }
    );
    return panel;
  }

  private getHtml(): string {
    if (!this.context) {
      return "";
    }
    const extensionUri = this.context?.extensionUri;
    const bundlePath = this.panel?.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "dist", "renderer.js")
    );
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Nocalhost Renderer</title>
          <meta charset="utf-8" />
        </head>
        <body>
          <div id="root"></div>
          <script src="${bundlePath}"></script>
        </body>
      </html>
    `;
  }

  public setContext(context: vscode.ExtensionContext): NocalhostWebview {
    this.context = context;
    return this;
  }

  public open(url: string, title?: string): NocalhostWebview {
    if (!this.panel) {
      this.panel = this.createWebviewPanel();
    }
    if (!this.messageManager) {
      this.messageManager = new MessageManager(this.panel);
    }
    if (title) {
      this.panel.title = title;
    }
    this.panel.webview.html = this.getHtml();
    this.postMessage({
      type: "location/redirect",
      payload: { url },
    });
    return this;
  }

  public addMessageListener(listener: MessageListener): void {
    this.messageManager?.addListener(listener);
  }

  public removeMessageListener(listener: MessageListener): void {
    this.messageManager?.removeListener(listener);
  }

  public postMessage(message: IMessage): void {
    this.messageManager?.postMessage(message);
  }
}

if (!instance) {
  instance = new NocalhostWebview();
}

export default instance;
