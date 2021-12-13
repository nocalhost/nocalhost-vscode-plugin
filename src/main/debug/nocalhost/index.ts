import * as vscode from "vscode";
import { NocalhostDebugAdapterDescriptorFactory } from "./debugAdapter";

export function activateNocalhostDebug(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory(
      "nocalhost",
      new NocalhostDebugAdapterDescriptorFactory()
    )
  );
}
