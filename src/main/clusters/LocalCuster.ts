import host from "../host";
import * as yamlUtils from "yaml";
import * as path from "path";
import * as fs from "fs";
import { LOCAL_PATH, KUBE_CONFIG_DIR } from "../constants";
import { isExistSync, writeFileAsync } from "../utils/fileUtil";
import { IRootNode } from "../domain";
import { IDevSpaceInfo, IV2ApplicationInfo } from "../domain";
import { getStringHash } from "../utils/common";
import * as yaml from "yaml";
import { checkCluster, getAllNamespace, kubeconfigCommand } from "../ctl/nhctl";
import { ClusterSource } from "../common/define";
import { ClustersState } from ".";

export class LocalClusterNode {
  constructor(
    public filePath: string,
    public id: string,
    public createTime: number,
    public state: ClustersState,
    public clusterNickName?: string
  ) {}
}

export default class LocalCluster {
  static getClusterNodeByKubeConfigPath(
    kubeConfigPath: string
  ): LocalClusterNode {
    const localClusterNodes = host.getGlobalState(LOCAL_PATH) || [];
    return (localClusterNodes || []).find(
      (it: LocalClusterNode) => it.filePath === kubeConfigPath
    );
  }

  static getLocalClusterRootNode = async (
    newLocalCluster: LocalClusterNode
  ): Promise<IRootNode> => {
    if (!newLocalCluster || !newLocalCluster.filePath) {
      return;
    }
    const { filePath, createTime } = newLocalCluster;
    let kubeConfig = "";
    let applications: IV2ApplicationInfo[] = [];
    let devSpaces: Array<IDevSpaceInfo> | undefined = new Array();
    if (!isExistSync(filePath)) {
      host.log(`no such file or directory: ${filePath}`);
      return;
    }
    const kubeStr = fs.readFileSync(filePath);
    const kubeConfigObj = yaml.parse(`${kubeStr}`);
    kubeConfig = `${kubeStr}`;
    const contexts = kubeConfigObj["contexts"];
    if (!contexts || contexts.length === 0) {
      return;
    }
    let defaultNamespace = contexts[0]["context"]["namespace"] || "";
    if (kubeConfigObj["current-context"]) {
      const currentContext = contexts.find(
        (it: any) => it.name === kubeConfigObj["current-context"]
      );
      if (currentContext) {
        defaultNamespace = currentContext.context.namespace;
      }
    }
    const state = await checkCluster(filePath);

    if (state.code === 200) {
      devSpaces = await getAllNamespace({
        kubeConfigPath: filePath,
        namespace: defaultNamespace as string,
      });
    }

    const contextObj = {
      applicationName: "default.application",
      applicationUrl: "",
      applicationConfigPath: "",
      nocalhostConfig: "",
      source: "",
      resourceDir: "",
      installType: "",
    };
    applications.push({
      id: 0,
      userId: 0,
      public: 1,
      editable: 1,
      context: JSON.stringify(contextObj),
      status: 1,
    });
    const obj: IRootNode = {
      id: newLocalCluster.id,
      devSpaces,
      clusterName: newLocalCluster.clusterNickName,
      createTime,
      clusterSource: ClusterSource.local,
      applications,
      kubeConfigPath: filePath,
      state,
    };
    return obj;
  };

  static verifyLocalCluster = () => {
    let localClusterNodes = host.getGlobalState(LOCAL_PATH) || [];
    localClusterNodes = localClusterNodes.filter((it: LocalClusterNode) => {
      if (!it.filePath) {
        return false;
      }
      return isExistSync(it.filePath);
    });
    host.setGlobalState(LOCAL_PATH, localClusterNodes);
  };

  static appendLocalClusterByKubeConfig = async (
    kubeConfig: string,
    contextName?: string
  ): Promise<LocalClusterNode> => {
    const localClusterNodes = host.getGlobalState(LOCAL_PATH) || [];
    const yamlObj = yamlUtils.parse(kubeConfig);
    if (contextName) {
      yamlObj["current-context"] = contextName;
    }

    const yamlStr = yamlUtils.stringify(yamlObj);
    if (!fs.existsSync(KUBE_CONFIG_DIR)) {
      fs.mkdirSync(KUBE_CONFIG_DIR);
    }
    const hash = getStringHash(yamlStr.trim());
    const resultFilePath = path.resolve(KUBE_CONFIG_DIR, hash);

    const state = await checkCluster(resultFilePath);

    const newCluster = new LocalClusterNode(
      resultFilePath,
      hash,
      Date.now(),
      state
    );

    if (
      !localClusterNodes.find(
        (it: LocalClusterNode) => it.filePath === resultFilePath
      )
    ) {
      writeFileAsync(resultFilePath, yamlStr);
      localClusterNodes.push(newCluster);
      host.setGlobalState(LOCAL_PATH, localClusterNodes);

      kubeconfigCommand(resultFilePath, "add");

      return newCluster;
    } else {
      host.log(`The cluster already exists`, true);
    }
    return null;
  };
}
