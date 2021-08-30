import * as vscode from "vscode";
import * as yamlUtils from "yaml";
import * as os from "os";
import * as path from "path";
import NocalhostAppProvider from "../appProvider";
import { SIGN_IN } from "../commands/constants";
import { NocalhostRootNode } from "../nodes/NocalhostRootNode";

import { LocalCluster } from "../clusters";
import host from "../host";
import { readYaml, readFile, getYamlDefaultContext } from "../utils/fileUtil";
import state from "../state";

export class HomeWebViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "Nocalhost.Home";

  private _view?: vscode.WebviewView;
  private appTreeProvider: NocalhostAppProvider;
  constructor(
    private readonly _extensionUri: vscode.Uri,
    appTreeProvider: NocalhostAppProvider
  ) {
    this.appTreeProvider = appTreeProvider;
  }

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
        case "connectServer": {
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
          const filePath = kubeConfigUri[0].fsPath;
          const yaml = await readYaml(filePath);
          const contexts = yaml.contexts || [];
          webviewView.webview.postMessage({
            type: "kubeConfig",
            payload: {
              path: filePath,
              currentContext: getYamlDefaultContext(yaml),
              contexts,
            },
          });
          break;
        }
        case "initKubePath": {
          const homeDir = os.homedir();
          try {
            const defaultKubePath = path.resolve(homeDir, ".kube", "config");
            const yaml = await readYaml(defaultKubePath);
            if (!yaml) {
              break;
            }
            const contexts = yaml.contexts || [];
            webviewView.webview.postMessage({
              type: "initKubePath-response",
              payload: {
                defaultKubePath,
                contexts,
                currentContext: getYamlDefaultContext(yaml),
              },
            });
            break;
          } catch (e) {
            break;
          }
        }
        case "local": {
          host.showProgressing("Adding ...", async () => {
            const localData = data.data;

            const { localPath, kubeConfig, contextName } = localData;

            let newLocalCluster = null;
            if (localPath) {
              const str = await readFile(localPath);
              newLocalCluster = await LocalCluster.appendLocalClusterByKubeConfig(
                str,
                contextName
              );
            }
            if (kubeConfig) {
              newLocalCluster = await LocalCluster.appendLocalClusterByKubeConfig(
                kubeConfig
              );
            }
            if (newLocalCluster) {
              const newLocalNode = await LocalCluster.getLocalClusterRootNode(
                newLocalCluster
              );
            }

            await state.refreshTree();

            vscode.window.showInformationMessage("Success");
          });
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

			<meta name="viewport" content="width=device-width, initial-scale=1.0, min-width=480">

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
