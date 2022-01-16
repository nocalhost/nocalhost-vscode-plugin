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
import { readYaml, getKubeconfigContext } from "../utils/fileUtil";
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
          case "selectKubeConfig": {
            let { localPath } = data.data ?? {};

            if (!localPath) {
              const kubeConfigUri = await host.showSelectFileDialog(
                "select your kubeConfig"
              );
              if (!kubeConfigUri || kubeConfigUri.length < 1) {
                return;
              }
              localPath = kubeConfigUri[0].fsPath;
            }

            const yaml = await readYaml<IKubeconfig>(localPath);

            assert(yaml, "The selected kubeconfig is invalid,Please check");

            const contexts = yaml.contexts || [];
            webviewView.webview.postMessage({
              type,
              payload: {
                localPath,
                currentContext: getKubeconfigContext(yaml)?.name,
                contexts,
              },
            });
            break;
          }
          case "initKubePath": {
            const homeDir = os.homedir();
            try {
              const defaultKubePath = path.resolve(homeDir, ".kube", "config");

              const yaml = await readYaml<IKubeconfig>(defaultKubePath);
              if (!yaml) {
                break;
              }

              const contexts = yaml.contexts || [];

              webviewView.webview.postMessage({
                type,
                payload: {
                  defaultKubePath,
                  contexts,
                  currentContext: getKubeconfigContext(yaml)?.name,
                },
              });
              break;
            } catch (e) {
              break;
            }
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
    contextName: string;
    strKubeconfig?: string;
    namespace?: string;
    localPath?: string;
  }) {
    const { localPath, strKubeconfig, contextName, namespace } = data;
    let kubeconfig: IKubeconfig;

    if (localPath) {
      kubeconfig = await readYaml<IKubeconfig>(localPath);
    } else {
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
        (context) => context.name === contextName
      ).context.namespace = namespace;
    }

    kubeconfig["current-context"] = contextName;

    return { kubeconfig, contextName, namespace };
  }

  private async checkKubeconfig(
    type: string,
    data: any,
    webviewView: vscode.WebviewView
  ) {
    let { kubeconfig, namespace, contextName } = await this.getKubeconfig(data);

    let payload: { namespace: string; result: any };

    if (!kubeconfig) {
      payload = {
        namespace,
        result: { status: "FAIL", tips: "Kubeconfig Invalid,Please check" },
      };
    } else {
      if (!namespace) {
        namespace = getKubeconfigContext(kubeconfig, contextName)?.context
          .namespace;
      }
      payload = {
        namespace,
        result: await checkKubeconfig(yaml.stringify(kubeconfig), contextName),
      };
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
