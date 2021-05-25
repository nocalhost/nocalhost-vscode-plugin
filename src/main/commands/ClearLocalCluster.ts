import * as vscode from "vscode";
import * as fs from "fs";
import ICommand from "./ICommand";
import { LOCAL_PATH, SERVER_CLUSTER_LIST } from "../constants";
import { CLEAR_LOCAL_CLUSTER } from "./constants";
import host from "../host";
import { LocalClusterNode } from "../clusters/LocalCuster";
import registerCommand from "./register";

export default class ClearLocalCluster implements ICommand {
  command: string = CLEAR_LOCAL_CLUSTER;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand() {
    const localClusterNodes: LocalClusterNode[] = host.getGlobalState(
      LOCAL_PATH
    ) as LocalClusterNode[];

    localClusterNodes.forEach((f) => {
      fs.unlinkSync(f.filePath);
    });
    host.setGlobalState(LOCAL_PATH, []);
  }
}
