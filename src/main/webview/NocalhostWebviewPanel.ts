import * as path from "path";
import * as vscode from "vscode";
import MessageManager, { IMessage, MessageListener } from "./MessageManager";
import Stack from "./Stack";
import CallableStack from "./CallableStack";
import * as fileStore from "../store/fileStore";

export default class NocalhostWebviewPanel {
  public static readonly viewType: string = "nocalhostWebview";
  public static currentPanel: NocalhostWebviewPanel | null = null;
  private readonly panel: vscode.WebviewPanel | null = null;
  private disposables: vscode.Disposable[] = [];
  private static readonly messageManager: MessageManager = new MessageManager();
  private static readonly openStack: Stack = new Stack();
  private static readonly postMessageStack: Stack = new Stack();
  private static readonly disposeHandlerStack: CallableStack = new CallableStack();
  private static readonly activeHandlerStack: CallableStack = new CallableStack();
  private static readonly inactiveHandlerStack: CallableStack = new CallableStack();

  public static open(url: string, title = "Nocalhost") {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;
    if (NocalhostWebviewPanel.currentPanel) {
      NocalhostWebviewPanel.currentPanel.update(title);
      NocalhostWebviewPanel.currentPanel.panel?.reveal(column);
      return;
    }
    const panel: vscode.WebviewPanel = vscode.window.createWebviewPanel(
      NocalhostWebviewPanel.viewType,
      title,
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
      }
    );
    NocalhostWebviewPanel.currentPanel = new NocalhostWebviewPanel(panel);
    NocalhostWebviewPanel.openStack.push(url);
  }

  public static postMessage(message: IMessage): void {
    if (NocalhostWebviewPanel.currentPanel) {
      NocalhostWebviewPanel.currentPanel.panel?.webview.postMessage(message);
    }
    NocalhostWebviewPanel.postMessageStack.push(message);
  }

  public static addMessageListener(listener: MessageListener): void {
    NocalhostWebviewPanel.messageManager.addListener(listener);
  }

  public static removeMessageListener(listener: MessageListener): void {
    NocalhostWebviewPanel.messageManager.removeListener(listener);
  }

  public static onDispose(handler: () => void): void {
    NocalhostWebviewPanel.disposeHandlerStack.push(handler);
  }

  public static onActive(handler: () => void): void {
    NocalhostWebviewPanel.activeHandlerStack.push(handler);
  }

  public static onInactive(handler: () => void): void {
    NocalhostWebviewPanel.inactiveHandlerStack.push(handler);
  }

  private constructor(panel: vscode.WebviewPanel) {
    this.panel = panel;
    this.update();
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.onDidChangeViewState(
      () => this.viewChange(),
      null,
      this.disposables
    );
    this.panel.webview.onDidReceiveMessage(
      (message: IMessage) => {
        NocalhostWebviewPanel.messageManager.notify(message);
      },
      null,
      this.disposables
    );
  }

  public dispose(): void {
    NocalhostWebviewPanel.currentPanel = null;
    this.panel?.dispose();
    while (this.disposables.length) {
      const item: vscode.Disposable | undefined = this.disposables.pop();
      if (item) {
        item.dispose();
      }
    }
    NocalhostWebviewPanel.disposeHandlerStack.exec();
  }

  public update(title?: string) {
    if (this.panel) {
      if (title) {
        this.panel.title = title;
      }
      this.panel.webview.html = this.getHtml();
      const url: string = NocalhostWebviewPanel.openStack.peek();
      const message: IMessage = NocalhostWebviewPanel.postMessageStack.peek();
      if (url) {
        NocalhostWebviewPanel.postMessage({
          type: "location/redirect",
          payload: { url },
        });
      }
      if (message) {
        NocalhostWebviewPanel.postMessage(message);
      }
    }
  }

  private viewChange(): void {
    if (this.panel?.visible) {
      this.update();
      NocalhostWebviewPanel.activeHandlerStack.exec();
    } else {
      NocalhostWebviewPanel.inactiveHandlerStack.exec();
    }
  }

  private getHtml(): string {
    if (!this.panel) {
      return "";
    }
    const webview: vscode.Webview = this.panel.webview;
    const extensionPath: string = fileStore.get("extensionPath");
    if (!webview || !extensionPath) {
      return "";
    }
    const bundlePath: vscode.Uri = webview.asWebviewUri(
      vscode.Uri.file(path.join(extensionPath, "dist", "renderer.js"))
    );
    const syntaxThemeLight: vscode.Uri = webview.asWebviewUri(
      vscode.Uri.file(path.join(extensionPath, "dist", "atom-one-light.css"))
    );
    const syntaxThemeDark: vscode.Uri = webview.asWebviewUri(
      vscode.Uri.file(path.join(extensionPath, "dist", "vs2015.css"))
    );
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Nocalhost</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link id="syntax-theme" type="text/css" rel="stylesheet" data-light="${syntaxThemeLight}" data-dark="${syntaxThemeDark}" href="${syntaxThemeDark}" />
        </head>
        <body>
          <div id="root"></div>
          <script src="${bundlePath}"></script>
        </body>
      </html>
    `;
  }
}
