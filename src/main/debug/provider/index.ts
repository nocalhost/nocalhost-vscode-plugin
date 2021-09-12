import * as vscode from "vscode";

import { JavaDebugProvider } from "./javaDebugProvider";
import { NodeDebugProvider } from "./nodeDebugProvider";
import { GoDebugProvider } from "./goDebugProvider";
import { PythonDebugProvider } from "./pythonDebugProvider";
import { IDebugProvider } from "./iDebugProvider";

const support = {
  node: NodeDebugProvider,
  java: JavaDebugProvider,
  golang: GoDebugProvider,
  python: PythonDebugProvider,
};

export type Language = keyof typeof support;

export async function chooseDebugProvider(
  type?: Language
): Promise<IDebugProvider> {
  const supportType = Object.keys(support) as Array<Language>;

  if (!type) {
    type = (await vscode.window.showQuickPick(supportType)) as Language;
  }

  let debugProvider = support[type];

  return new debugProvider();
}
