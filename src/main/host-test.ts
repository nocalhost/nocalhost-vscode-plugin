import * as vscode from "vscode";
import { Host } from "./host";
const ignoreFocusOut = true;
export default class HostTest extends Host {
  async showOpenDialog(
    options: vscode.OpenDialogOptions
  ): Promise<vscode.Uri[] | undefined> {
    const path = await this.showInputBox({
      title: options.title,
      ignoreFocusOut,
    });
    let uris: vscode.Uri[] = [];

    if (path) {
      uris.push(vscode.Uri.parse(path));
    }
    return uris;
  }
  showSelectFileDialog(title: string, defaultUri?: vscode.Uri) {
    return this.showOpenDialog({
      defaultUri: defaultUri,
      canSelectFolders: false,
      canSelectFiles: true,
      canSelectMany: false,
      title: title,
    });
  }
  showInformationMessage(
    msg: string,
    options?: vscode.MessageOptions,
    ...items: string[]
  ): Thenable<string | undefined> {
    if (options.modal) {
      return this.showInputBox({ title: msg, ignoreFocusOut });
    }
    return super.showInformationMessage(msg, options, ...items);
  }
}
