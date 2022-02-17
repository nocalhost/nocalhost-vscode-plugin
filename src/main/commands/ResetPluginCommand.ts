import vscode from "vscode";
import ICommand from "./ICommand";
import { RESET_PLUGIN } from "./constants";
import registerCommand from "./register";
import { LOCAL_PATH, SERVER_CLUSTER_LIST } from "../constants";
import host from "../host";
import state from "../state";

export default class ResetPluginCommand implements ICommand {
  command: string = RESET_PLUGIN;
  context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }

  async execCommand() {
    const res = await host.showInformationMessage(
      "The will reset all your existing pluing configurations, you need to reconnect to cluster after reset. Do you want to continue?",
      { modal: true },
      "reset"
    );

    if (res === "reset") {
      host.removeGlobalState(SERVER_CLUSTER_LIST);
      host.removeGlobalState(LOCAL_PATH);

      await state.refreshTree(true);

      host.showInformationMessage("The plugin has been reset.");
    }
  }
}
