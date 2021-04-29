import * as vscode from "vscode";
import ICommand from "./ICommand";
import { LOAD_RESOURCE, APPLY_KUBERNETES_OBJECT } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { KubernetesResourceNode } from "../nodes/abstract/KubernetesResourceNode";
import { AppNode } from "../nodes/AppNode";
import TextDocumentContentProvider from "../textDocumentContentProvider";
import EventCenter from "../common/EventCenter";
import { Deployment } from "../nodes/workloads/controllerResources/deployment/Deployment";

export default class LoadResourceCommand implements ICommand {
  command: string = LOAD_RESOURCE;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }

  async execCommand(node: KubernetesResourceNode | AppNode) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    if (node instanceof KubernetesResourceNode) {
      if (!node) {
        host.showWarnMessage("A task is running, please try again later");
        return;
      }
      const kind: string = node.resourceType;
      const name: string = node.name;
      let scheme: string = "NocalhostRW";
      let isDeveloping: boolean = false;
      if (node instanceof Deployment) {
        isDeveloping = (await node.getStatus()) === "developing";
      }
      if (isDeveloping) {
        scheme = "Nocalhost";
      }
      const kubeconfig = node.getKubeConfigPath();
      const uri: vscode.Uri = vscode.Uri.parse(
        `${scheme}://k8s/loadResource/${kind}/${name}.yaml?id=${node.getNodeStateId()}&kubeConfigPath=${node.getKubeConfigPath()}&namespace=${node.getNameSpace()}`
      );
      const doc: vscode.TextDocument = await vscode.workspace.openTextDocument(
        uri
      );
      await vscode.window.showTextDocument(doc, {
        preview: false,
        preserveFocus: false,
      });

      const eventCeneter: EventCenter = EventCenter.getInstance();
      eventCeneter.addSaveTextDocumentListener(this.handleSaveTextDocument);
    } else if (node instanceof AppNode) {
      if (!node.installed()) {
        host.showInformationMessage(`${node.label} is not installed.`);
        return;
      }
      const name: string = node.name;
      const uri: vscode.Uri = vscode.Uri.parse(
        `nhtext://loadresource/${name}.yaml?type=nh&name=${name}&kubeConfigPath=${node.getKubeConfigPath()}`
      );
      let doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { preview: true });
      TextDocumentContentProvider.getInstance().update(uri);
    }
  }

  async handleSaveTextDocument(doc: vscode.TextDocument): Promise<void> {
    const uri: vscode.Uri = doc.uri;
    const { scheme, authority } = uri;
    if (scheme === "NocalhostRW" && authority === "k8s") {
      const confirm:
        | string
        | undefined = await vscode.window.showInformationMessage(
        `Apply this resource?`,
        {
          modal: true,
        },
        "OK"
      );
      if (confirm === "OK") {
        vscode.commands.executeCommand(APPLY_KUBERNETES_OBJECT, uri);
      }
    }
  }
}
