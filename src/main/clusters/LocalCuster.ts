import host from "../host";
import * as yamlUtils from "yaml";
import * as path from "path";
import state from "../state";
import * as fs from "fs";
import * as kubectl from "../ctl/kubectl";
import { uniq } from "lodash";
import { LOCAL_PATH, KUBE_CONFIG_DIR } from "../constants";
import { readYaml, writeKubeConfigFile } from "../utils/fileUtil";
import { IRootNode } from "../domain";
import { ApplicationInfo, DevspaceInfo, V2ApplicationInfo } from "../api";
import { getStringHash } from "../utils/common";
import * as yaml from "yaml";

export class LocalClusterNode {
  filePath: string;
  id: string;
  createTime: number;
}

export default class LocalCluster {
  static getLocalClusterRootNode = async (
    newLocalCluster: LocalClusterNode
  ): Promise<IRootNode> => {
    if (!newLocalCluster || !newLocalCluster.filePath) {
      return;
    }
    const { filePath, createTime } = newLocalCluster;
    let kubeConfig = "";
    let applications: V2ApplicationInfo[] = [];
    let devSpaces: Array<DevspaceInfo> | undefined = new Array();
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
    devSpaces = await kubectl.getAllNamespace(
      filePath,
      defaultNamespace as string
    );

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
    const obj = {
      id: newLocalCluster.id,
      devSpaces,
      createTime,
      applications,
      old: [] as ApplicationInfo[],
      localPath: filePath,
      kubeConfig,
    };
    return obj;
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
    const newCluster: LocalClusterNode = {
      filePath: resultFilePath,
      id: hash,
      createTime: Date.now(),
    };
    if (
      !localClusterNodes.find(
        (it: LocalClusterNode) => it.filePath === resultFilePath
      )
    ) {
      fs.writeFileSync(resultFilePath, yamlStr, { encoding: "utf-8" });
      localClusterNodes.push(newCluster);
      host.setGlobalState(LOCAL_PATH, localClusterNodes);
      return newCluster;
    } else {
      host.log(`The cluster already exists`, true);
    }
    return null;
  };
}
