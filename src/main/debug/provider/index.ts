import {
  commands,
  extensions,
  ProgressLocation,
  window,
  Uri,
  env,
} from "vscode";

import { JavaDebugProvider } from "./java";
import { NodeDebugProvider } from "./nodeDebugProvider";
import { GoDebugProvider } from "./goDebugProvider";
import { PythonDebugProvider } from "./pythonDebugProvider";
import { PhpDebugProvider } from "./phpDebugProvider";
import { RubyDebugProvider } from "./rubyDebugProvider";
import { IDebugProvider } from "./IDebugProvider";
import { which } from "../../ctl/shell";

export const support = {
  node: NodeDebugProvider,
  java: JavaDebugProvider,
  golang: GoDebugProvider,
  python: PythonDebugProvider,
  php: PhpDebugProvider,
  ruby: RubyDebugProvider,
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

async function checkDebuggerDependencies(debugProvider: IDebugProvider) {
  await checkBinary(debugProvider);

  await checkExtension(debugProvider);

  await debugProvider.checkExtensionDependency();
}

async function checkBinary(debugProvider: IDebugProvider) {
  const { commandName, name } = debugProvider;

  if (!(await which(debugProvider.commandName))) {
    const choice = await window.showErrorMessage(
      `Failed to find the "${commandName}" binary in PATH. Check PATH, or Install ${name} and reload the window. `,
      "Go to Download Page"
    );

    if (choice === "Go to Download Page") {
      const uri = Uri.parse(debugProvider.downloadUrl);
      env.openExternal(uri);
    }

    return Promise.reject();
  }
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
async function checkExtension(debugProvider: IDebugProvider) {
  const { requireExtensions, name } = debugProvider;

  if (existExtensions(requireExtensions)) {
    return;
  }

  let answer = await window.showWarningMessage(
    `Debugger Support for "${name}" require. Please install and enable it.`,
    "Install"
  );

  if (answer === "Install") {
    await window.withProgress(
      { location: ProgressLocation.Notification },
      async (p) => {
        p.report({
          message: `Installing Debugger Support for "${name}" ...`,
        });

        for (const id of requireExtensions) {
          await commands.executeCommand(
            "workbench.extensions.installExtension",
            id
          );
        }
      }
    );

    const RELOAD = "Reload Window";
    const choice = await window.showInformationMessage(
      `Please reload window to activate Debugger Support for "${name}".`,
      RELOAD
    );
    if (choice === RELOAD) {
      await commands.executeCommand("workbench.action.reloadWindow");
    }
  }

  return Promise.reject();
}

export { chooseDebugProvider, Language, checkDebuggerDependencies };
