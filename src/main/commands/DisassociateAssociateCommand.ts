import * as vscode from "vscode";

import ICommand from "./ICommand";

import { DISASSOCIATE_ASSOCIATE } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { AssociateNode } from "../component/syncManage/node";
import * as nhctl from "../ctl/nhctl";

export default class DisassociateAssociateCommand implements ICommand {
  command: string = DISASSOCIATE_ASSOCIATE;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: AssociateNode) {
    if (!node) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }

    const {
      associate: {
        svc_pack: { ns, app, svc, svc_type, container },
      },
      associate,
      currentPath,
    } = node;

    await nhctl.associate(
      associate.kubeconfig_path,
      ns,
      app,
      currentPath,
      svc_type,
      svc,
      container,
      "--de-associate"
    );
  }
}
