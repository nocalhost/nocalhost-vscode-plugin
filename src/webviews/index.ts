import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function showWelcome() {
  const welcomePage = fs.readFileSync(path.resolve(__dirname, '../../static/welcome/index.html'), 'utf-8');

  const welcomePanel = vscode.window.createWebviewPanel('html', 'welcome',  vscode.ViewColumn.One,{
    // Enable scripts in the webview
    enableScripts: true
  });

  welcomePanel.webview.html = welcomePage;

  // Handle messages from the webview
  welcomePanel.webview.onDidReceiveMessage(
    message => {
      vscode.window.showErrorMessage(message.text);
      switch (message.command) {
        case 'login':
          vscode.commands.executeCommand('showLogin');
          return;
      }
    },
    undefined,
    []
  );

  // return welcomePage;
}