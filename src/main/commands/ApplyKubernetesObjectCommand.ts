import * as vscode from "vscode";
import * as querystring from "querystring";
import * as tempy from "tempy";
import ICommand from "./ICommand";
import registerCommand from "./register";
import host from "../host";
import services, { ServiceResult } from "../common/DataCenter/services";
import state from "../state";
import { KubernetesResourceNode } from "../nodes/abstract/KubernetesResourceNode";
import { NocalhostRootNode } from "../nodes/NocalhostRootNode";
import { AppNode } from "../nodes/AppNode";
import { NocalhostAccountNode } from "../nodes/NocalhostAccountNode";
import { APPLY_KUBERNETES_OBJECT } from "./constants";
import { Deployment } from "../nodes/workloads/controllerResources/deployment/Deployment";

export default class ApplyKubernetesObjectCommand implements ICommand {
  command: string = APPLY_KUBERNETES_OBJECT;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(target: any) {
    let result: ServiceResult = {
      success: false,
      value: "",
    };

    if (target instanceof AppNode) {
      result = await this.applyNode(target);
    } else {
      const scheme: string = target.scheme;
      switch (scheme) {
        case "NocalhostRW": {
          result = await this.applyVirtualDocument(target);
          break;
        }
        case "file": {
          result = await this.applyFile(target);
          break;
        }
        default:
          break;
      }
    }

    if (result.success) {
      if (result.value) {
        host.showInformationMessage(result.value);
      }
    } else {
      if (result.value) {
        host.showErrorMessage(result.value);
      }
    }
  }

  private async applyVirtualDocument(target: any): Promise<ServiceResult> {
    const query: string = target.query;
    const queryObj: querystring.ParsedUrlQuery = querystring.parse(query);
    const id: string = queryObj.id as string;
    const node: KubernetesResourceNode = state.getNode(
      id
    ) as KubernetesResourceNode;
    const nodeName: string = node.name;
    const kubeConfig: string = node.getKubeConfigPath();
    const appNode: AppNode = node.getAppNode();
    const namespace: string = appNode.namespace;
    let isDeveloping: boolean = false;
    if (node instanceof Deployment) {
      isDeveloping = (await node.getStatus()) === "developing";
    }
    if (isDeveloping) {
      return {
        success: false,
        value: "Unable to apply, please exit the dev mode first.",
      };
    }
    const editor: vscode.TextEditor | undefined =
      vscode.window.activeTextEditor;
    if (!editor) {
      return {
        success: false,
        value: "",
      };
    }
    const doc: vscode.TextDocument = editor.document;
    const content: string = doc.getText();
    const path: string = tempy.writeSync(content, {
      name: `${nodeName}-${namespace}.yaml`,
    });
    const result: ServiceResult = await services.applyKubernetesObject(
      path,
      kubeConfig
    );
    return result;
  }

  private async applyFile(target: any): Promise<ServiceResult> {
    if (!state.isLogin()) {
      return {
        success: false,
        value: `Please sign in to nocalhost first.`,
      };
    }
    const path: string = target.fsPath;
    const applications: Array<
      AppNode | NocalhostAccountNode
    > = NocalhostRootNode.getChildNodes();
    if (applications.length === 0) {
      return {
        success: false,
        value: `No applicaiton found.`,
      };
    }
    const options: { [key: string]: string } = applications.reduce(
      (acc, applicaiton: AppNode | NocalhostAccountNode) => {
        return {
          ...acc,
          ...(applicaiton instanceof AppNode &&
          applicaiton.developingNodes.length === 0
            ? { [applicaiton.label]: applicaiton.getKubeConfigPath() }
            : {}),
        };
      },
      {}
    );
    const selected: string | undefined = await vscode.window.showQuickPick(
      Object.keys(options),
      {
        placeHolder: "Select an application to apply the resource.",
      }
    );
    if (!selected) {
      return {
        success: false,
        value: "",
      };
    }
    const kubeConfig: string = options[selected];
    const result: ServiceResult = await services.applyKubernetesObject(
      path,
      kubeConfig
    );
    return result;
  }

  private async applyNode(target: AppNode): Promise<ServiceResult> {
    const kubeConfig: string = target.getKubeConfigPath();
    const paths: vscode.Uri[] | undefined = await host.showOpenDialog({
      canSelectMany: false,
    });
    if (!paths) {
      return {
        success: false,
        value: "",
      };
    }
    const path: string = paths[0].fsPath;
    const result: ServiceResult = await services.applyKubernetesObject(
      path,
      kubeConfig
    );
    return result;
  }
}
