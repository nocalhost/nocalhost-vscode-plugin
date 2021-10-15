import * as vscode from "vscode";

type ConfigName = "nhctl.checkVersion";

export function getConfiguration(name: ConfigName) {
  const KEY = "nocalhost." + name;

  return (
    process.env[KEY.toUpperCase().replace(/\./g, "_")] ||
    vscode.workspace.getConfiguration().get(KEY)
  );
}

export function getBooleanValue(name: ConfigName) {
  const value: boolean | string = getConfiguration(name);

  if (typeof value === "string") {
    return value !== "0";
  }
  return value;
}
