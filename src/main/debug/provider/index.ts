import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
const retry = require("async-retry");

import { JavaDebugProvider } from "./javaDebugProvider";
import { NodeDebugProvider } from "./nodeDebugProvider";
import { GoDebugProvider } from "./goDebugProvider";
import { PythonDebugProvider } from "./pythonDebugProvider";
import host from "../../host";

const support = {
  node: NodeDebugProvider,
  java: JavaDebugProvider,
  golang: GoDebugProvider,
  python: PythonDebugProvider,
};

type Language = keyof typeof support;

async function chooseDebugProvider(type?: Language): Promise<IDebugProvider> {
  const supportType = Object.keys(support) as Array<Language>;

  if (!type) {
    type = (await vscode.window.showQuickPick(supportType)) as Language;
  }

  let debugProvider = support[type];

  return new debugProvider();
}
async function startDebugging(
  workspaceFolder: string,
  config: vscode.DebugConfiguration
): Promise<boolean> {
  const currentFolder = (vscode.workspace.workspaceFolders || []).find(
    (folder) => folder.name === path.basename(workspaceFolder)
  );
  return await vscode.debug.startDebugging(currentFolder, config);
}
function checkDebuggerInstalled(debugProvider: IDebugProvider) {
  const { requireExtensions, name } = debugProvider;

  if (requireExtensions.length > 0 && !existExtensions(requireExtensions)) {
    guideToInstallExtension(name, requireExtensions);
    return false;
  }

  return true;
}

function existExtensions(extensionArray: string[]) {
  return extensionArray.every((extensionId) => {
    const extension = vscode.extensions.getExtension(extensionId);

    if (extension && !extension.isActive) {
      extension.activate();
    }

    return extension;
  });
}
/**
 * install
 */
async function guideToInstallExtension(name: string, extensionArray: string[]) {
  let answer = await vscode.window.showWarningMessage(
    `Debugger Support for ${name} require. Please install and enable it.`,
    "Install"
  );

  if (!answer) {
    return;
  }

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification },
    async (p) => {
      p.report({
        message: `Installing Debugger Support for ${name} ...`,
      });

      for (const id of extensionArray) {
        await vscode.commands.executeCommand(
          "workbench.extensions.installExtension",
          id
        );
      }
    }
  );

  const RELOAD = "Reload Window";
  const choice = await vscode.window.showInformationMessage(
    `Please reload window to activate Debugger Support for ${name}.`,
    RELOAD
  );
  if (choice === RELOAD) {
    await vscode.commands.executeCommand("workbench.action.reloadWindow");
  }
}

interface IDebugProvider {
  name: string;
  requireExtensions: Array<string>;
  getDebugConfiguration(
    name: string,
    port: number,
    remoteRoot: string
  ): Promise<vscode.DebugConfiguration>;
}

export {
  IDebugProvider,
  chooseDebugProvider,
  Language,
  startDebugging,
  checkDebuggerInstalled,
};
