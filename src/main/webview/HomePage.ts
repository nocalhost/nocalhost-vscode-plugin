import * as vscode from "vscode";
import * as os from "os";
import * as path from "path";
import * as yaml from "yaml";

import { SIGN_IN } from "../commands/constants";
import { NocalhostRootNode } from "../nodes/NocalhostRootNode";

import { LocalCluster } from "../clusters";
import host from "../host";
import { readYaml } from "../utils/fileUtil";
import state from "../state";
import { NOCALHOST } from "../constants";
import { checkKubeconfig, IKubeconfig } from "../ctl/nhctl";
import logger from "../utils/logger";
import { existsSync } from "fs";

export class HomeWebViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "Nocalhost.Home";

  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      enableCommandUris: true,
      localResourceRoots: [this._extensionUri],
    };
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(
      async (data: { data: any; type: string }) => {
        const { type } = data;

        switch (type) {
          case "connectServer": {
            vscode.commands.executeCommand(SIGN_IN, data.data);
            break;
          }
          case "parseKubeConfig":
          case "selectKubeConfig": {
            const payload = data.data ?? {};
            let { strKubeconfig, path: localPath } = payload;

            if (type === "selectKubeConfig" && !localPath) {
              const kubeConfigUri = await host.showSelectFileDialog(
                "select your kubeConfig"
              );
              if (!kubeConfigUri || kubeConfigUri.length < 1) {
                return;
              }
              localPath = kubeConfigUri[0].fsPath;
            }

            const { kubeconfig } = await this.getKubeconfig({
              path: localPath,
              strKubeconfig,
            });

            webviewView.webview.postMessage({
              type,
              payload: {
                ...payload,
                path: localPath,
                strKubeconfig,
                kubeconfig,
              },
            });
            break;
          }
          case "initKubePath": {
            const payload = data.data ?? {};

            let { path: defaultKubePath } = payload;

            let kubeconfig: IKubeconfig;
            if (defaultKubePath) {
              kubeconfig = await readYaml<IKubeconfig>(defaultKubePath);
            } else {
              defaultKubePath = path.resolve(os.homedir(), ".kube", "config");

              if (existsSync(defaultKubePath)) {
                kubeconfig = await readYaml<IKubeconfig>(defaultKubePath);
              } else {
                defaultKubePath = null;
              }
            }

            webviewView.webview.postMessage({
              type,
              payload: {
                ...payload,
                path: defaultKubePath,
                kubeconfig,
              },
            });
            break;
          }
          case "checkKubeconfig":
            this.checkKubeconfig(type, data.data, webviewView);
            break;

          case "local": {
            host.showProgressing("Adding ...", async () => {
              let { kubeconfig } = await this.getKubeconfig(data.data);

              let newLocalCluster =
                await LocalCluster.appendLocalClusterByKubeConfig(kubeconfig);

              if (newLocalCluster) {
                await LocalCluster.getLocalClusterRootNode(newLocalCluster);

                const node = state.getNode(NOCALHOST) as NocalhostRootNode;

                node && (await node.addCluster(newLocalCluster));

                await state.refreshTree(true);

                vscode.window.showInformationMessage("Success");
              }
            });
            break;
          }
        }
      }
    );
  }
  private async getKubeconfig(data: {
    currentContext?: string;
    strKubeconfig?: string;
    namespace?: string;
    path?: string;
  }) {
    const { path, strKubeconfig, currentContext, namespace } = data;
    let kubeconfig: IKubeconfig;

    if (path) {
      kubeconfig = await readYaml<IKubeconfig>(path);
    } else if (strKubeconfig) {
      try {
        kubeconfig = yaml.parse(strKubeconfig);
      } catch (error) {
        logger.error("checkKubeconfig yaml parse", error);
      }
    }

    if (kubeconfig) {
      if (namespace) {
        const context = kubeconfig.contexts?.find(
          (context) => context.name === currentContext
        )?.context;

        if (context) {
          context.namespace = namespace;
        }
      }
      if (currentContext) {
        kubeconfig["current-context"] = currentContext;
      }
    }

    return { kubeconfig, currentContext, namespace, path, strKubeconfig };
  }

  private async checkKubeconfig(
    type: string,
    data: any,
    webviewView: vscode.WebviewView
  ) {
    let { kubeconfig, currentContext, path, strKubeconfig } =
      await this.getKubeconfig(data);

    let str: string = strKubeconfig;

    if (kubeconfig) {
      str = yaml.stringify(kubeconfig);
    }

    let payload = await checkKubeconfig({ path, str }, currentContext);

    webviewView.webview.postMessage({
      type,
      payload,
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
			<script type="module" src="${bundlePath}"></script>
		</body>
		</html>`;
  }
}
