import * as vscode from "vscode";
import ICommand from "./ICommand";
import { EDIT_MANIFEST, APPLY_KUBERNETES_OBJECT } from "./constants";
import registerCommand from "./register";
import host from "../host";
import { KubernetesResourceNode } from "../nodes/abstract/KubernetesResourceNode";
import { AppNode } from "../nodes/AppNode";
import TextDocumentContentProvider from "../textDocumentContentProvider";
import EventCenter from "../common/EventCenter";
import { Deployment } from "../nodes/workloads/controllerResources/deployment/Deployment";

export default class EditManifestCommand implements ICommand {
  command: string = EDIT_MANIFEST;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }

  async execCommand(node: KubernetesResourceNode | AppNode) {
    if (!node) {
      host.showWarnMessage("Failed to get node configs, please try again.");
      return;
    }
    if (node instanceof KubernetesResourceNode) {
      if (!node) {
        host.showWarnMessage("Failed to get node configs, please try again.");
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
      let uri: vscode.Uri = vscode.Uri.parse(
        `${scheme}://k8s/editManifest/${kind}/${name}.yaml?id=${node.getNodeStateId()}&kubeConfigPath=${kubeconfig}&namespace=${node.getNameSpace()}`
      );
      const doc: vscode.TextDocument = await vscode.workspace.openTextDocument(
        uri
      );
      try {
        await vscode.window.showTextDocument(doc, {
          preview: false,
          preserveFocus: false,
        });
      } catch (e) {
        console.log(e);
      }

      const eventCeneter: EventCenter = EventCenter.getInstance();
      eventCeneter.addSaveTextDocumentListener(this.handleSaveTextDocument);
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
