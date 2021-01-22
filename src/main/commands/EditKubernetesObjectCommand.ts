import * as vscode from "vscode";
import ICommand from "./ICommand";
import registerCommand from "./register";
import host from "../host";
import services, { ServiceResult } from "../common/DataCenter/services";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";
import {
  IKubernetesResourceSourceMap,
  saveKubernetesResource,
  getSourceMap,
} from "../store/kubernetesResourceStore";
import { EDIT_KUBERNETES_OBJECT } from "./constants";
import EventCenter from "../common/EventCenter";

export default class EditKubernetesObjectCommand implements ICommand {
  command: string = EDIT_KUBERNETES_OBJECT;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: ControllerResourceNode) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    const nodeStateId: string = node.getNodeStateId();
    const appName: string = node.getAppName();
    const kind: string = node.resourceType;
    const nodeName: string = node.name;
    const namespace: string = node.getAppNode().namespace;
    const kubeConfig: string = node.getKubeConfigPath();
    const result: ServiceResult = await services.fetchKubernetesResource(
      kind,
      nodeName,
      kubeConfig
    );
    if (!result.success) {
      return host.showErrorMessage(result.value);
    }
    const resourcePath: string = saveKubernetesResource(
      `${nodeName}-${namespace}.yaml`,
      result.value,
      {
        nodeStateId,
        appName,
        kind,
        nodeName,
        kubeConfig,
      }
    );
    let uri: vscode.Uri = vscode.Uri.file(resourcePath);
    let doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, {
      preview: false,
      preserveFocus: false,
    });
    // setInterval(() => {
    //   console.log(
    //     vscode.workspace.textDocuments.map((t) => t.fileName).join(",")
    //   );
    // }, 5000);
    // const eventCenter: EventCenter = EventCenter.getInstance();
    // eventCenter.addCloseTextDocumentListener(this.handleCloseManifest);
  }
  handleCloseManifest(doc: vscode.TextDocument): void {
    const sourceMap: IKubernetesResourceSourceMap | null = getSourceMap();
    const filepath: string = doc.fileName;
    if (sourceMap && sourceMap[filepath]) {
      host.showInformationMessage(`Apply?`, { modal: true }, "Yes");
    }
  }
}
