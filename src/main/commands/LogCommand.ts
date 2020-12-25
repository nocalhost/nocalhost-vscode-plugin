import * as vscode from "vscode";
import ICommand from "./ICommand";
import { LOG } from "./constants";
import registerCommand from "./register";
import host from "../host";
import * as kubectl from "../ctl/kubectl";
import * as shell from "../ctl/shell";
import { KubernetesResourceNode } from "../nodes/abstract/KubernetesResourceNode";
import { Resource, PodResource } from "../nodes/types/resourceType";
import NocalhostWebviewPanel from "../webview/NocalhostWebviewPanel";
import { LOG_INTERVAL_MS } from "../constants";

export default class LogCommand implements ICommand {
  command: string = LOG;
  private timer: NodeJS.Timer | null = null;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(node: KubernetesResourceNode) {
    if (!node) {
      host.showWarnMessage("A task is running, please try again later");
      return;
    }
    const kind = node.resourceType;
    const name = node.name;
    const appNode = node.getAppNode();
    const resArr = await kubectl.getControllerPod(
      appNode.getKUbeconfigPath(),
      kind,
      name
    );
    if (resArr && resArr.length <= 0) {
      host.showErrorMessage("Not found pod");
      return;
    }
    const podNameArr = (resArr as Array<Resource>).map((res) => {
      return res.metadata.name;
    });
    let podName: string | undefined = podNameArr[0];
    if (podNameArr.length > 1) {
      podName = await vscode.window.showQuickPick(podNameArr);
    }
    if (!podName) {
      return;
    }
    const podStr = await kubectl.loadResource(
      appNode.getKUbeconfigPath(),
      "pod",
      podName,
      "json"
    );
    const pod = JSON.parse(podStr as string) as PodResource;
    const containerNameArr = pod.spec.containers.map((c) => {
      return c.name;
    });
    let containerName: string | undefined = containerNameArr[0];
    if (containerNameArr.length > 1) {
      containerName = await vscode.window.showQuickPick(containerNameArr);
    }
    if (!containerName) {
      return;
    }

    if (podName && containerName) {
      NocalhostWebviewPanel.open("/logs", node.label);
      const kubeConfig: string = node.getKubeConfigPath();
      this.openLogs(node.getNodeStateId(), podName, containerName, kubeConfig);
    }

    // const uri = vscode.Uri.parse(
    //   `Nocalhost://k8s/log/${podName}/${containerName}?id=${node.getNodeStateId()}`
    // );
    // let doc = await vscode.workspace.openTextDocument(uri);
    // const editor = await vscode.window.showTextDocument(doc, {
    //   preview: false,
    // });
    // const lineCount = editor.document.lineCount;
    // const range = editor.document.lineAt(lineCount - 1).range;
    // editor.selection = new vscode.Selection(range.end, range.end);
    // editor.revealRange(range);
  }

  private openLogs(
    logId: string,
    podName: string,
    containerName: string,
    kubeConfig: string
  ) {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.sendLogs(logId, podName, containerName, kubeConfig);
    this.timer = setInterval(() => {
      this.sendLogs(logId, podName, containerName, kubeConfig);
    }, LOG_INTERVAL_MS);
  }

  private async sendLogs(
    logId: string,
    podName: string,
    containerName: string,
    kubeConfig: string
  ) {
    const items: string[] = await this.fetchLogs(
      podName,
      containerName,
      kubeConfig
    );
    NocalhostWebviewPanel.postMessage({
      type: "logs/update",
      payload: {
        logs: {
          id: logId,
          items,
        },
      },
    });
  }

  private async fetchLogs(
    podName: string,
    containerName: string,
    kubeConfig: string
  ): Promise<string[]> {
    let result: string = "";
    const shellObj = await shell.execAsync(
      `kubectl logs ${podName} -c ${containerName} --kubeconfig ${kubeConfig}`,
      []
    );
    if (shellObj.code === 0) {
      result = shellObj.stdout;
    } else {
      result = shellObj.stderr;
    }
    return result.split("\n");
  }
}
