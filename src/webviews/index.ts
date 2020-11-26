import * as vscode from "vscode";
import * as path from "path";

export function showDashboard(context: vscode.ExtensionContext) {
  const createWebviewContent = (bundlePath: vscode.Uri): string => {
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
  };

  const panel = vscode.window.createWebviewPanel(
    "html",
    "Dashbaord",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
    }
  );

  const bundleUri: vscode.Uri = vscode.Uri.file(
    path.join(context.extensionPath, "out/renderer/bundle.js")
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
