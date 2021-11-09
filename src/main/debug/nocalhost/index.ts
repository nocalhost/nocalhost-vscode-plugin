import * as vscode from "vscode";
import {
  NocalhostConfigurationProvider,
  NocalhostDebugAdapterDescriptorFactory,
} from "./debugAdapter";

export function activateNocalhostDebug(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider(
      "nocalhost",
      new NocalhostConfigurationProvider()
    ),
    vscode.debug.registerDebugAdapterDescriptorFactory(
      "nocalhost",
      new NocalhostDebugAdapterDescriptorFactory()
    )
  );
}
