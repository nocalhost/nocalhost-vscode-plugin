import * as vscode from "vscode";

import * as kubectl from "../../../../ctl/kubectl";
import { KubernetesResourceFolder } from "../../../abstract/KubernetesResourceFolder";
import { DEPLOYMENT_FOLDER } from "../../../nodeContants";
import { BaseNocalhostNode, SvcProfile } from "../../../types/nodeType";
import { List, ResourceStatus } from "../../../types/resourceType";
import { Deployment } from "./Deployment";
import refreshSchedule from "../../../../schedule/refreshSchedule";

export class DeploymentFolder extends KubernetesResourceFolder {
  constructor(public parent: BaseNocalhostNode) {
    super();
    this.parent = parent;
    refreshSchedule.getInstance()?.addNode(this);
  }
  getParent(element: BaseNocalhostNode): BaseNocalhostNode {
    return this.parent;
  }
  public label: string = "Deployments";
  public type: string = DEPLOYMENT_FOLDER;
  async getChildren(
    parent?: BaseNocalhostNode
  ): Promise<vscode.ProviderResult<Deployment[]>> {
    const res = await kubectl.getResourceList(
      this.getKubeConfigPath(),
      "Deployments"
    );
    const list = JSON.parse(res as string) as List;
    const appNode = this.getAppNode();
    const appInfo = await appNode.getApplicationInfo();
    const result: Deployment[] = list.items.map((item) => {
      const status = item.status as ResourceStatus;
      const svcProfiles = appInfo.svcProfile;
      let svcProfile: SvcProfile | undefined | null;
      for (let i = 0; i < svcProfiles.length; i++) {
        if (svcProfiles[i].name === item.metadata.name) {
          svcProfile = svcProfiles[i];
          break;
        }
      }
      const node = new Deployment(
        this,
        item.metadata.name,
        item.metadata.name,
        status.conditions || ((status as unknown) as string),
        svcProfile,
        item
      );
      return node;
    });
    return result;
  }
}
