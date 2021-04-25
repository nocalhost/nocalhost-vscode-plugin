import * as vscode from "vscode";
import * as tempy from "tempy";

import { SIGN_IN } from "../commands/constants";
import { IS_LOCAL, LOCAL_PATH } from "../constants";

import host from "../host";

export class HomeWebViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "Nocalhost.Home";

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      enableCommandUris: true,

      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "login": {
          vscode.commands.executeCommand(SIGN_IN, data.data);
          break;
        }
        case "selectKubeConfig": {
          const kubeConfigUri = await host.showSelectFileDialog(
            "select your kubeConfig"
          );
          if (!kubeConfigUri || kubeConfigUri.length < 1) {
            return;
          }
          webviewView.webview.postMessage({
            type: "kubeConfig",
            payload: kubeConfigUri[0].fsPath || "",
          });
          break;
        }
        case "local": {
          const localData = data.data;
          const { isLocalPath, localPath, kubeConfig } = localData;
          // set localPath
          // TODO: validate kubeconfig
          let tempLocalPath = "";
          host.setGlobalState(IS_LOCAL, true);
          if (isLocalPath === "1") {
            tempLocalPath = localPath;
          }
          if (isLocalPath === "0") {
            tempLocalPath = tempy.writeSync(kubeConfig, {
              name: `temp-kubeConfig`,
            });
          }
          host.setGlobalState(LOCAL_PATH, tempLocalPath);
          await vscode.commands.executeCommand("setContext", "local", true);
          break;
        }
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const bundlePath = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist", "home.js")
    );
    // Do the same for the stylesheet.
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "static", "home", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "static", "home", "vscode.css")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "static", "home", "main.css")
    );

    return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">

			<meta name="viewport" content="width=device-width, initial-scale=1.0">

			<link href="${styleResetUri}" rel="stylesheet">
			<link href="${styleVSCodeUri}" rel="stylesheet">
			<link href="${styleMainUri}" rel="stylesheet">
			
			<title>Home</title>
		</head>
		<body>
			<div id="root"></div>
			<script src="${bundlePath}"></script>
		</body>
		</html>`;
  }
}
