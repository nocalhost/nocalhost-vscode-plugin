import * as vscode from "vscode";
import * as path from "path";

export function showDashboard(context: vscode.ExtensionContext) {
  const createWebviewContent = (bundlePath: vscode.Uri): string => {
    // return `
    //   <!DOCTYPE html>
    //   <html lang="en">
    //     <head>
    //       <title>Nocalhost Renderer</title>
    //       <meta charset="utf-8" />
    //     </head>
    //     <body>
    //       <div id="root"></div>
    //       <script src="${bundlePath}"></script>
    //     </body>
    //   </html>
    // `;
    return `
      <!DOCTYPE html>
      <html lang="en">
      
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome</title>
        <style>
      
          body.vscode-light {
            color: black;
          }
      
          body.vscode-dark {
            color: white;
          }
      
          body.vscode-light .divider {
              background: black;
              height: 2px;
              margin-top: 10px;
              margin-bottom: 10px;
          }
      
          body.vscode-dark .divider {
              background: white;
              height: 2px;
              margin-top: 10px;
              margin-bottom: 10px;
          }
      
          .sign {
            cursor: pointer;
            color: var(--vscode-textLink-foreground);
          }
        </style>
      </head>
      
      <body>
        <h1>Welcome to Nocalhost</h1>
        <div class="divider"></div>
        Nocalhost is a CloudNative Development Enviroment. You can coding in VSCode on Kubernetes with no friction.
        <br /><br />
        Before you start, please make sure:
        <br />
        <ul>
          <li>kubectl is installed</li>
          <li>helm is installed if you develop helm apps</li>
          <li>nhctl is installed</li>
          <li>mutagen is installed</li>
          <li>ssh is installed</li>
        </ul><br />
        then,
        <br /><br />
        click <span class="sign" onclick="signInHandler()">sign in</span> to start.
        <br /><br />
        <a href="https://nocalhost.dev/">Click here</a> for more details.
      
        <script>
          const vscode = acquireVsCodeApi();
          function signInHandler() {
            vscode.postMessage({
              command: 'login',
              text: 'login nocalhost'
            })
          }
        </script>
      </body>
      
      </html>
    `;
  };

  const panel = vscode.window.createWebviewPanel(
    "html",
    "Welcome",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
    }
  );

  const bundleUri: vscode.Uri = vscode.Uri.file(
    path.join(context.extensionPath, "dist/renderer.js")
  );
  const bundlePath: vscode.Uri = panel.webview.asWebviewUri(bundleUri);
  panel.webview.html = createWebviewContent(bundlePath);

  // Handle messages from the webview
  panel.webview.onDidReceiveMessage(
    (message) => {
      switch (message.command) {
        case "login":
          vscode.commands.executeCommand("Nocalhost.signin");
          return;
      }
    },
    undefined,
    []
  );
}
