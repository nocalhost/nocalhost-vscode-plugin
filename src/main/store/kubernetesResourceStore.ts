import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";
import { KUBE_RESOURCE_DIR, KUBE_RESOURCE_SOURCEMAP } from "../constants";

export interface IKubernetesResourceSourceMapValue {
  nodeStateId: string;
  appName: string;
  nodeName: string;
  kind: string;
  kubeConfig: string;
}

export interface IKubernetesResourceSourceMap {
  [key: string]: IKubernetesResourceSourceMapValue;
}

export interface IUpdateKubernetesResourceSourceMapOptions {
  path: string;
  nodeStateId: string;
  appName: string;
  nodeName: string;
  kind: string;
  kubeConfig: string;
}

export function saveKubernetesResource(
  filename: string,
  content: string,
  sourceMap?: IKubernetesResourceSourceMapValue
): string {
  if (!filename) {
    throw new Error(`[error] save tmp file failure, filename cannot be empty`);
  }
  const resourcePath: string = path.resolve(KUBE_RESOURCE_DIR, filename);
  fs.writeFileSync(resourcePath, sanitizeResource(content), {
    encoding: "utf-8",
  });
  if (sourceMap) {
    const { nodeStateId, appName, nodeName, kind, kubeConfig } = sourceMap;
    updateSourceMap({
      path: resourcePath,
      nodeStateId,
      appName,
      nodeName,
      kind,
      kubeConfig,
    });
  }
  return resourcePath;
}

export function getSourceMap(): IKubernetesResourceSourceMap | null {
  const isExist: boolean = fs.existsSync(KUBE_RESOURCE_SOURCEMAP);
  if (!isExist) {
    return null;
  }
  try {
    const content: string = fs.readFileSync(KUBE_RESOURCE_SOURCEMAP, {
      encoding: "utf-8",
    });
    return JSON.parse(content);
  } catch (e) {
    console.error(e);
    return null;
  }
}

function updateSourceMap(
  options: IUpdateKubernetesResourceSourceMapOptions
): void {
  const { path, nodeStateId, appName, nodeName, kind, kubeConfig } = options;
  const isExist: boolean = fs.existsSync(KUBE_RESOURCE_SOURCEMAP);
  if (!isExist) {
    fs.writeFileSync(KUBE_RESOURCE_SOURCEMAP, "{}", { encoding: "utf-8" });
  }
  try {
    const sourceMap: IKubernetesResourceSourceMap = JSON.parse(
      fs.readFileSync(KUBE_RESOURCE_SOURCEMAP, { encoding: "utf-8" })
    );
    sourceMap[path] = {
      nodeStateId,
      appName,
      nodeName,
      kind,
      kubeConfig,
    };
    fs.writeFileSync(KUBE_RESOURCE_SOURCEMAP, JSON.stringify(sourceMap), {
      encoding: "utf-8",
    });
  } catch (e) {
    console.error(e);
  }
}

function sanitizeResource(content: string): string {
  try {
    const resource: any = yaml.parse(content);
    delete resource.status;
    delete resource.metadata?.resourceVersion;
    const annotations = resource.metadata?.annotations;
    if (annotations) {
      delete annotations["kubectl.kubernetes.io/last-applied-configuration"];
    }
    return yaml.stringify(resource);
  } catch (e) {
    console.error(e);
  }
  return content;
}
