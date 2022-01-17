import * as vscode from "vscode";
import * as os from "os";
import * as path from "path";
import * as yaml from "yaml";
import assert = require("assert");
import { isObject } from "lodash";

import { SIGN_IN } from "../commands/constants";
import { NocalhostRootNode } from "../nodes/NocalhostRootNode";

import { LocalCluster } from "../clusters";
import host from "../host";
import { readYaml } from "../utils/fileUtil";
import state from "../state";
import { NOCALHOST } from "../constants";
import { checkKubeconfig, IKubeconfig } from "../ctl/nhctl";
import logger from "../utils/logger";

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
            let { strKubeconfig } = data.data ?? {};

            let localPath: string;

            if (type === "selectKubeConfig") {
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

            !strKubeconfig &&
              assert(
                kubeconfig,
                "The selected kubeconfig is invalid,Please check"
              );

            webviewView.webview.postMessage({
              type,
              payload: {
                path: localPath,
                strKubeconfig,
                kubeconfig,
              },
            });
            break;
          }
          case "initKubePath": {
            const homeDir = os.homedir();
            const defaultKubePath = path.resolve(homeDir, ".kube", "config");

            const kubeconfig = await readYaml<IKubeconfig>(defaultKubePath);
            if (!yaml) {
              break;
            }

            webviewView.webview.postMessage({
              type,
              payload: {
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

              let newLocalCluster = await LocalCluster.appendLocalClusterByKubeConfig(
                kubeconfig
              );

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
        return {};
      }
    }

    if (!isObject(kubeconfig)) {
      return {};
    }

    if (namespace) {
      kubeconfig.contexts.find(
        (context) => context.name === currentContext
      ).context.namespace = namespace;
    }
    if (currentContext) {
      kubeconfig["current-context"] = currentContext;
    }

    return { kubeconfig, currentContext, namespace };
  }

  private async checkKubeconfig(
    type: string,
    data: any,
    webviewView: vscode.WebviewView
  ) {
    let { kubeconfig, currentContext } = await this.getKubeconfig(data);

    let payload: any;

    if (!kubeconfig) {
      payload = { status: "FAIL", tips: "Kubeconfig Invalid,Please check" };
    } else {
      payload = await checkKubeconfig(
        yaml.stringify(kubeconfig),
        currentContext
      );
    }

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
			<script src="${bundlePath}"></script>
		</body>
		</html>`;
  }
}
