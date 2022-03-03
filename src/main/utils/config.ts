import * as vscode from "vscode";

type ConfigName = "checkNhctlVersion" | "showWelcome";

export type Switch = "on" | "off";

export function getConfiguration<T>(name: ConfigName) {
  return (vscode.workspace.getConfiguration().get(`nocalhost.${name}`) ||
    null) as T;
}

/**
 *
 * @param name
 * @param value
 * @param configurationTarget The {@link ConfigurationTarget configuration target} or a boolean value.
 *    - If `true` updates {@link ConfigurationTarget.Global Global settings}.
 *    - If `false` updates {@link ConfigurationTarget.Workspace Workspace settings}.
 *    - If `undefined` or `null` updates to {@link ConfigurationTarget.WorkspaceFolder Workspace folder settings} if configuration is resource specific,
 */
export function updateConfiguration(
  name: ConfigName,
  value: any,
  configurationTarget: vscode.ConfigurationTarget | boolean | null = true
) {
  vscode.workspace
    .getConfiguration()
    .update(`nocalhost.${name}`, value, configurationTarget);
}
