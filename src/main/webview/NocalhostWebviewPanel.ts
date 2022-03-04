import * as path from "path";
import * as vscode from "vscode";
import * as qs from "qs";
import MessageManager, {
  IMessage,
  MessageListener,
} from "../common/MessageManager";
import Stack from "../common/Stack";
import CallableStack from "../common/Stack/CallableStack";
import host from "../host";
import { resolveExtensionFilePath } from "../utils/fileUtil";

interface IWebviewOpenProps {
  url: string;
  title?: string;
  newTab?: boolean;
  query?: {
    [key: string]: any;
  };
}

export default class NocalhostWebviewPanel {
  public static readonly viewType: string = "nocalhostWebview";
  public static currentPanel: NocalhostWebviewPanel | null = null;
  private static id: number = 0;
  private static readonly panels: Map<number, NocalhostWebviewPanel> =
    new Map();
  private static readonly messageManager: MessageManager = new MessageManager();

  private id: number = 0;
  private url: string = "";
  private panel: vscode.WebviewPanel | null = null;
  private disposables: vscode.Disposable[] = [];
  private openStack: Stack = new Stack();
  private postMessageStack: Stack = new Stack();
  private disposeHandlerStack: CallableStack = new CallableStack();
  private activeHandlerStack: CallableStack = new CallableStack();
  private inactiveHandlerStack: CallableStack = new CallableStack();

  public static open(props: IWebviewOpenProps) {
    let url: string = props.url;
    const title: string = props.title || "Nocalhost";
    const newTab: boolean = props.newTab || false;
    const query = props.query || {};
    const column: vscode.ViewColumn | undefined = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;
    if (Object.keys(query).length > 0) {
      url = `${url}?${qs.stringify(query)}`;
    }
    const panel: NocalhostWebviewPanel =
      NocalhostWebviewPanel.getPanelByURL(url);
    if (panel) {
      NocalhostWebviewPanel.openOnExistPanel(panel, url, title, column);
    } else {
      if (NocalhostWebviewPanel.currentPanel) {
        if (newTab) {
          NocalhostWebviewPanel.openOnNewPanel(url, title, column);
        } else {
          NocalhostWebviewPanel.openOnExistPanel(
            NocalhostWebviewPanel.currentPanel,
            url,
            title,
            column
          );
        }
      } else {
        NocalhostWebviewPanel.openOnNewPanel(url, title, column);
      }
    }
  }

  public static postMessage(message: IMessage, id: number): void {
    if (!id) {
      console.error(
        `[error] NocalhostWebviewPanel#postMessage: id should not be undefined.`
      );
      return;
    }
    const targetPanel: NocalhostWebviewPanel | undefined =
      NocalhostWebviewPanel.panels.get(id);
    if (targetPanel) {
      targetPanel.panel?.webview.postMessage(message);
      targetPanel.postMessageStack.push(message);
    }
  }

  public static addMessageListener(listener: MessageListener): void {
    NocalhostWebviewPanel.messageManager.addListener(listener);
  }

  public static removeMessageListener(listener: MessageListener): void {
    NocalhostWebviewPanel.messageManager.removeListener(listener);
  }

  public static getPanelById(id: number): NocalhostWebviewPanel | undefined {
    return NocalhostWebviewPanel.panels.get(id);
  }

  public static getPanelByURL(url: string): NocalhostWebviewPanel | undefined {
    if (NocalhostWebviewPanel.panels.size === 0) {
      return undefined;
    }
    for (const [, obj] of NocalhostWebviewPanel.panels) {
      if (obj.getURL() === url) {
        return obj;
      }
    }
    return undefined;
  }

  private static openOnExistPanel(
    panel: NocalhostWebviewPanel,
    url: string,
    title: string,
    column: vscode.ViewColumn | undefined
  ): void {
    panel.openStack.push(url);
    panel.postMessageStack.push({
      type: "location/redirect",
      payload: { url },
    });
    NocalhostWebviewPanel.currentPanel = panel;
    NocalhostWebviewPanel.currentPanel.update(title);
    NocalhostWebviewPanel.currentPanel.panel?.reveal(
      column || vscode.ViewColumn.One
    );
  }

  private static openOnNewPanel(
    url: string,
    title: string,
    column: vscode.ViewColumn | undefined
  ): void {
    const id: number = ++NocalhostWebviewPanel.id;
    const webviewPanel: vscode.WebviewPanel = vscode.window.createWebviewPanel(
      NocalhostWebviewPanel.viewType,
      title,
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
      }
    );

    webviewPanel.iconPath = resolveExtensionFilePath("images", "favicon.ico");

    const panel: NocalhostWebviewPanel = new NocalhostWebviewPanel(
      id,
      url,
      webviewPanel
    );
    NocalhostWebviewPanel.panels.set(id, panel);
    NocalhostWebviewPanel.currentPanel = panel;
  }

  public onDispose(handler: () => void): void {
    this.disposeHandlerStack.push(handler);
  }

  public onActive(handler: () => void): void {
    this.activeHandlerStack.push(handler);
  }

  public onInactive(handler: () => void): void {
    this.inactiveHandlerStack.push(handler);
  }

  public getURL(): string {
    return this.url;
  }

  public setURL(url: string): void {
    this.url = url;
  }

  public update(title?: string) {
    if (this.panel) {
      if (title) {
        this.panel.title = title;
      }
      this.panel.webview.html = this.getHtml();
      const url: string = this.openStack.peek();
      const message: IMessage = this.postMessageStack.peek();
      if (url) {
        NocalhostWebviewPanel.postMessage(
          {
            type: "location/redirect",
            payload: { url },
          },
          this.id
        );
      }
      if (message) {
        NocalhostWebviewPanel.postMessage(message, this.id);
      }
    }
  }

  private constructor(id: number, url: string, panel: vscode.WebviewPanel) {
    this.id = id;
    this.url = url;
    this.openStack.push(url);
    this.panel = panel;
    this.panel.onDidDispose(() => this.didDispose(), null, this.disposables);
    this.panel.onDidChangeViewState(
      () => this.viewChange(),
      null,
      this.disposables
    );
    this.panel.webview.onDidReceiveMessage(
      (message: IMessage) => {
        NocalhostWebviewPanel.messageManager.notify(message, id);
      },
      null,
      this.disposables
    );

    process.nextTick(this.update.bind(this));

    NocalhostWebviewPanel.addMessageListener(({ type }, id) => {
      if (type === "init" && id === this.id) {
        NocalhostWebviewPanel.postMessage(
          {
            type: "location/redirect",
            payload: { url },
          },
          this.id
        );
      }
    });
  }

  private didDispose(): void {
    NocalhostWebviewPanel.panels.delete(this.id);
    if (NocalhostWebviewPanel.currentPanel === this) {
      NocalhostWebviewPanel.currentPanel = null;
    }
    this.panel?.dispose();
    while (this.disposables.length) {
      const item: vscode.Disposable | undefined = this.disposables.pop();
      if (item) {
        item.dispose();
      }
    }
    this.disposeHandlerStack.exec();
  }

  private viewChange(): void {
    if (this.panel?.visible) {
      NocalhostWebviewPanel.currentPanel = this;
      this.update();
      this.activeHandlerStack.exec();
    } else {
      this.inactiveHandlerStack.exec();
    }
  }
  private getAppStatic(name: string) {
    return this.panel.webview.asWebviewUri(
      resolveExtensionFilePath("static", "app", name)
    );
  }
  private getHtml(): string {
    if (!this.panel) {
      return "";
    }
    const webview: vscode.Webview = this.panel.webview;
    const extensionPath: string = host.getGlobalState("extensionPath");
    if (!webview || !extensionPath) {
      return "";
    }

    const bundlePath: vscode.Uri = webview.asWebviewUri(
      vscode.Uri.file(path.join(extensionPath, "dist", `renderer_v1.js`))
    );

    const lightCss = this.getAppStatic("atom-one-light.css");
    const darkCss = this.getAppStatic("vs2015.css");
    const font = this.getAppStatic("DroidSansMono_v1.ttf");

    let markdownLinkBlock = "";

    if (this.url === "/welcome") {
      markdownLinkBlock = `<link href="${this.getAppStatic(
        "markdown.css"
      )}" rel="stylesheet">`;
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Nocalhost</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link id="syntax-theme" type="text/css" rel="stylesheet" data-light="${lightCss}" data-dark="${darkCss}" href="${darkCss}" />
          ${markdownLinkBlock}
          <style type="text/css">
            @font-face {
              font-family: 'droidsansmono';
              src: url(${font}) format("truetype");
              font-weight: normal;
              font-style: normal;
            }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" src="${bundlePath}"></script>
        </body>
      </html>
    `;
  }
}
