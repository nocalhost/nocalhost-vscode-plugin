import * as vscode from "vscode";
import ICommand from "./ICommand";
import registerCommand from "./register";
import host from "../host";
import services, { ServiceResult } from "../common/DataCenter/services";
import {
  IKubernetesResourceSourceMap,
  getSourceMap,
} from "../store/kubernetesResourceStore";
import state from "../state";
import { KubernetesResourceNode } from "../nodes/abstract/KubernetesResourceNode";
import { NocalhostRootNode } from "../nodes/NocalhostRootNode";
import { AppNode } from "../nodes/AppNode";
import { NocalhostAccountNode } from "../nodes/NocalhostAccountNode";
import { APPLY_KUBERNETES_OBJECT } from "./constants";

export default class ApplyKubernetesObjectCommand implements ICommand {
  command: string = APPLY_KUBERNETES_OBJECT;
  constructor(context: vscode.ExtensionContext) {
    registerCommand(context, this.command, false, this.execCommand.bind(this));
  }
  async execCommand(target: any) {
    let result: ServiceResult;
    if (target instanceof KubernetesResourceNode) {
      const kubeConfig: string = target.getKubeConfigPath();
      const paths: vscode.Uri[] | undefined = await host.showOpenDialog({
        canSelectMany: false,
      });
      if (!paths) {
        return;
      }
      const path: string = paths[0].fsPath;
      result = await services.applyKubernetesObject(path, kubeConfig);
    } else {
      // apply file on kubeResources folder
      const path: string = target.fsPath;
      const sourceMap: IKubernetesResourceSourceMap | null = getSourceMap();
      if (sourceMap && sourceMap[path]) {
        const { kubeConfig } = sourceMap[path];
        result = await services.applyKubernetesObject(path, kubeConfig);
      } else {
        // apply file out of the kubeResources folder
        if (!state.isLogin()) {
          return host.showWarnMessage(`Please sign in to nocalhost first.`);
        }
        const applications: Array<
          AppNode | NocalhostAccountNode
        > = NocalhostRootNode.getChildNodes();
        if (applications.length === 0) {
          return host.showWarnMessage(`No applicaiton found.`);
        }
        const options: { [key: string]: string } = applications.reduce(
          (acc, applicaiton: AppNode | NocalhostAccountNode) => {
            return {
              ...acc,
              ...(applicaiton instanceof AppNode
                ? { [applicaiton.label]: applicaiton.getKUbeconfigPath() }
                : {}),
            };
          },
          {}
        );
        const selected:
          | string
          | undefined = await vscode.window.showQuickPick(
          Object.keys(options),
          { placeHolder: "Select the application to apply the resource." }
        );
        if (!selected) {
          return;
        }
        const kubeConfig: string = options[selected];
        result = await services.applyKubernetesObject(path, kubeConfig);
      }
    }
    if (result.success) {
      host.showInformationMessage(result.value);
    } else {
      host.showErrorMessage(result.value);
    }
  }
}
