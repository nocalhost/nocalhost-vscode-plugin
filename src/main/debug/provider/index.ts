import { commands, extensions, ProgressLocation, window } from "vscode";

import { JavaDebugProvider } from "./java";
import { NodeDebugProvider } from "./nodeDebugProvider";
import { GoDebugProvider } from "./goDebugProvider";
import { PythonDebugProvider } from "./pythonDebugProvider";
import { IDebugProvider } from "./IDebugProvider";

export const support = {
  node: NodeDebugProvider,
  java: JavaDebugProvider,
  golang: GoDebugProvider,
  // python: PythonDebugProvider,
};

type Language = keyof typeof support;

async function chooseDebugProvider(type?: Language): Promise<IDebugProvider> {
  const supportType = Object.keys(support) as Array<Language>;

  if (!type) {
    type = (await window.showQuickPick(supportType, {
      title: "Please select the language to debug",
      ignoreFocusOut: true,
    })) as Language;
  }

  if (!type) {
    return Promise.reject();
  }

  let debugProvider = support[type];

  return new debugProvider();
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
    const extension = extensions.getExtension(extensionId);

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
  let answer = await window.showWarningMessage(
    `Debugger Support for ${name} require. Please install and enable it.`,
    "Install"
  );

  if (!answer) {
    return;
  }

  await window.withProgress(
    { location: ProgressLocation.Notification },
    async (p) => {
      p.report({
        message: `Installing Debugger Support for ${name} ...`,
      });

      for (const id of extensionArray) {
        await commands.executeCommand(
          "workbench.extensions.installExtension",
          id
        );
      }
    }
  );

  const RELOAD = "Reload Window";
  const choice = await window.showInformationMessage(
    `Please reload window to activate Debugger Support for ${name}.`,
    RELOAD
  );
  if (choice === RELOAD) {
    await commands.executeCommand("workbench.action.reloadWindow");
  }
}

export { chooseDebugProvider, Language, checkDebuggerInstalled };
