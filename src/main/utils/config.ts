import * as vscode from "vscode";

type ConfigName = "nhctl.checkVersion";
export function getConfiguration(name: ConfigName) {
  return vscode.workspace.getConfiguration().get(`nocalhost.${name}`);
}
