import {
  Disposable,
  Event,
  FileChangeEvent,
  FileStat,
  FileSystemProvider,
  window,
  FileType,
  Uri,
  EventEmitter,
  commands,
} from "vscode";
import * as yaml from "yaml";
import * as path from "path";
import { omit } from "lodash";
import * as querystring from "querystring";
import * as nhctl from "./ctl/nhctl";
import { get as _get } from "lodash";
import * as shell from "./ctl/shell";
import * as fileUtil from "./utils/fileUtil";
import host from "./host";
import state from "./state";
import ConfigService from "./service/configService";
import { HELM_VALUES_DIR } from "./constants";
import { CONFIG_URI_QUERY } from "./commands/constants";
import { KubernetesResourceNode } from "./nodes/abstract/KubernetesResourceNode";
import logger from "./utils/logger";

export default class NocalhostFileSystemProvider implements FileSystemProvider {
  static supportScheme = ["Nocalhost", "NocalhostRW"];
  static supportAuthority = ["k8s", "nh"];
  public dataMap: Map<Uri, Uint8Array> = new Map();
  private readonly onDidChangeFileEmitter: EventEmitter<
    FileChangeEvent[]
  > = new EventEmitter<FileChangeEvent[]>();
  onDidChangeFile: Event<FileChangeEvent[]> = this.onDidChangeFileEmitter.event;
  watch(
    uri: Uri,
    options: { recursive: boolean; excludes: string[] }
  ): Disposable {
    return new Disposable(() => {});
  }
  async stat(uri: Uri): Promise<FileStat> {
    const stat = {
      type: FileType.File,
      ctime: 0,
      mtime: 0,
      size: 65536,
    };
    const has = this.dataMap.has(uri);
    if (!has) {
      const bufferData = await this.readFile(uri);
      this.dataMap.set(uri, bufferData);
      stat.mtime = Date.now();
    } else {
      const bufferData = await this.readFile(uri);
      const buffer = this.dataMap.get(uri);
      if (buffer && buffer.toString() !== bufferData.toString()) {
        stat.mtime = Date.now();
      }
    }

    return stat;
  }
  readDirectory(
    uri: Uri
  ): [string, FileType][] | Thenable<[string, FileType][]> {
    return [];
  }
  createDirectory(uri: Uri): void | Thenable<void> {}
  async readFile(uri: Uri): Promise<Uint8Array> {
    /**
     *   foo://example.com:8042/over/there?name=ferret#nose
          \_/   \______________/\_________/ \_________/ \__/
          |           |            |            |        |
        scheme     authority       path        query   fragment
          |   _____________________|__
          / \ /                        \
          urn:example:animal:ferret:nose

        Nocalhost://k8s/loadResource/deployments/name
     */
    let result: string = "";

    this.checkSchema(uri);

    const authority = uri.authority;

    switch (authority) {
      case "k8s": {
        const paths = uri.path.split("/");
        const query = querystring.decode(uri.query);
        let id = "";
        let namespace = "";
        if (query) {
          id = query.id as string;
          namespace = query.namespace as string;
        }
        const type = paths[1];
        if (type === "loadResource") {
          const kind = paths[2];
          const names = paths[3].split(".");
          const name = names[0];
          const output = names[1];
          const node = state.getNode(id) as KubernetesResourceNode;
          result = await nhctl.getLoadResource({
            kubeConfigPath: node.getKubeConfigPath(),
            namespace,
            kind,
            name,
            outputType: output,
          });
          if (result) {
            result = this.sanitizeResource(result);
          }
        } else if (type === "log") {
          // Nocalhost://k8s/log/pod/container
          const node = state.getNode(id) as KubernetesResourceNode;
          const podName = paths[2];
          const containerName = paths[3];
          const command = nhctl.NhctlCommand.logs({
            kubeConfigPath: node.getKubeConfigPath(),
          })
            .addArgument(podName)
            .addArgument("-c", containerName)
            .getCommand();
          const shellObj = await shell.exec({ command }).promise;
          if (shellObj.code === 0) {
            result = shellObj.stdout;
          } else {
            result = shellObj.stderr;
          }
        }
        break;
      }

      case "nh": {
        // Nocalhost://nh/loadResource/name
        // Nocalhost://nh/config/app/{appName}/{key}/{subkey}

        // last string is .yaml or .json
        const style = uri.path.substring(uri.path.length - 4);
        const paths = uri.path.substring(0, uri.path.length - 5).split("/");
        const type = paths[1];
        const query = querystring.decode(
          uri.query || host.getGlobalState(CONFIG_URI_QUERY)
        );
        const kubeConfigPath = query.kubeConfigPath as string;
        const namespace = query.namespace as string;
        const workloadType = query.workloadType as string;
        if (type === "loadResource") {
          const name = paths[2];
          result = await nhctl.loadResource(
            host,
            kubeConfigPath,
            namespace,
            name
          );
        } else if (type === "config") {
          const configType = paths[2];
          if (configType === "app") {
            const appName = paths[3];
            const key = paths[4]; // Array|Object|string
            const subKey = paths[5]; // subPropery

            if (key && subKey) {
              if (key === "services" && subKey) {
                let serviceInfo = await ConfigService.getWorkloadConfig(
                  kubeConfigPath,
                  namespace,
                  appName,
                  subKey,
                  workloadType
                );
                if (!serviceInfo) {
                  result = await nhctl.getTemplateConfig(
                    kubeConfigPath,
                    namespace,
                    appName,
                    subKey
                  );
                } else {
                  result = this.stringify(serviceInfo, style) as string;
                }
              } else {
                const appInfo: any = await ConfigService.getAppConfig(
                  kubeConfigPath,
                  namespace,
                  appName
                );

                if (appInfo[key] instanceof Array) {
                  result = "";
                  logger.info(`[file provider array']: ${key}`);
                  for (let i = 0; i < appInfo[key].length; i++) {
                    if (appInfo[key][i] && appInfo[key][i].name === subKey) {
                      result = this.stringify([appInfo[key][i]], style) || "";
                    }
                  }
                } else if (appInfo[key] instanceof Object) {
                  const obj: any = {};
                  obj[subKey] = appInfo[key][subKey];
                  result = this.stringify(obj, style) as string;
                }
              }
            } else if (key) {
              const appInfo: any = await ConfigService.getAppConfig(
                kubeConfigPath,
                namespace,
                appName
              );
              const obj: any = {};
              obj[key] = appInfo[key];
              result = this.stringify(obj, style) || "";
            } else {
              // edit app config
              let appConfigInfo = await ConfigService.getAppAllConfig(
                kubeConfigPath,
                namespace,
                appName
              );
              result = this.stringify(appConfigInfo, style) as string;
            }
          }
        } else if (type === "helm-value" && paths[2] === "app") {
          // NocalhostRW://nh/helm-value/app/${appNode.name}.yaml
          const appName = paths[3];
          const valuePath = path.resolve(
            HELM_VALUES_DIR,
            `${appName}-values.yaml`
          );
          const isExist = await fileUtil.isExist(valuePath);
          if (!isExist) {
            result = "";
          } else {
            result = await fileUtil.readFile(valuePath);
          }
        } else if (type === "kubeConfig") {
          // Nocalhost://nh/kubeConfig/{appName}.yaml?fsPath=xxx
          const query = querystring.decode(uri.query);
          let fsPath = "";
          if (query) {
            fsPath = query.fsPath as string;
          }
          const isExist = await fileUtil.isExist(fsPath);
          if (!isExist) {
            result = "";
          } else {
            result = await fileUtil.readFile(fsPath);
          }
        }
        break;
      }
      default:
    }

    return Buffer.from(result, "utf-8");
  }
  async writeFile(
    uri: Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean }
  ): Promise<void> {
    const style = uri.path.substring(uri.path.length - 4);
    const paths = uri.path.substring(0, uri.path.length - 5).split("/");
    const type = paths[1];
    const data = this.parse(content.toString(), style);
    const query = querystring.decode(uri.query);

    let id = "";
    if (query) {
      id = query.id as string;
    }
    let destDir = "";
    let destData: string | Buffer = "";
    const kubeConfigPath = query.kubeConfigPath as string;
    const namespace = query.namespace as string;
    const workloadType = query.workloadType as string;
    let command: string | undefined;
    let args;
    if (type === "config") {
      const configType = paths[2];
      if (configType === "app") {
        const appName = paths[3];
        const key = paths[4]; // Array|Object|string
        const subKey = paths[5]; // subPropery

        // destDir = ConfigService.getAppConfigPath(appName);
        if (key === "services" && subKey) {
          await ConfigService.writeConfig(
            kubeConfigPath,
            namespace,
            appName,
            subKey,
            workloadType,
            data
          );
          command = "Nocalhost.refresh";
          commands.executeCommand(command, state.getNode(id));
          return;
        }

        const appInfo: any = await ConfigService.getAppConfig(
          kubeConfigPath,
          namespace,
          appName
        );
        let originData = "";
        if (key && subKey) {
          originData = this.getOriginData(subKey, data);
          if (appInfo[key] instanceof Array) {
            let replaced = false;
            for (let i = 0; i < appInfo[key].length; i++) {
              if (appInfo[key][i].name === subKey) {
                appInfo[key][i] = originData;
                replaced = true;
              }
            }
            if (!replaced) {
              appInfo[key].push(originData);
            }
            command = "Nocalhost.refresh";
            args = { appName: appName, workloadName: subKey };
          } else if (appInfo[key] instanceof Object) {
            appInfo[key][subKey] = originData;
          }
        } else if (key) {
          appInfo[key] = originData;
        } else {
          await ConfigService.writeAppConfig(
            kubeConfigPath,
            namespace,
            appName,
            data
          );
          return;
        }
        destData = Buffer.from(this.stringify(appInfo, style) || "", "utf-8");
      }
    } else if (type === "helm-value" && paths[2] === "app") {
      // NocalhostRW://nh/helm-value/app/${appNode.name}.yaml
      const appName = paths[3];
      const valuePath = path.resolve(HELM_VALUES_DIR, `${appName}-values.yaml`);
      destDir = valuePath;
    }

    if (destDir) {
      await fileUtil.writeFile(destDir, destData);
      if (command) {
        commands.executeCommand(command, args);
      }
    }
  }

  private stringify(obj: any, style: string) {
    if (style === "yaml") {
      return `${obj.__note || ""}${yaml.stringify(omit(obj, "__note"))}`;
    } else if (style === "json") {
      return JSON.stringify(obj, null, 2);
    }
  }

  private parse(str: string, style: string) {
    if (style === "yaml") {
      return yaml.parse(str);
    } else if (style === "json") {
      return JSON.parse(str);
    }
  }

  private getOriginData(name: string, obj: any) {
    if (obj instanceof Array) {
      for (let i = 0; i < obj.length; i++) {
        if (obj[i].name === name) {
          return obj[i] || "";
        }
      }
    } else {
      return obj[name] || "";
    }
  }

  private checkSchema(uri: Uri) {
    const authority = uri.authority;

    if (!NocalhostFileSystemProvider.supportScheme.includes(uri.scheme)) {
      throw new Error(
        `only support scheme: ${NocalhostFileSystemProvider.supportScheme}`
      );
    }

    if (!NocalhostFileSystemProvider.supportAuthority.includes(authority)) {
      throw new Error(
        `only support authority: ${NocalhostFileSystemProvider.supportAuthority}`
      );
    }
  }

  private sanitizeResource(content: string): string {
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

  delete(uri: Uri, options: { recursive: boolean }): void | Thenable<void> {}
  rename(
    oldUri: Uri,
    newUri: Uri,
    options: { overwrite: boolean }
  ): void | Thenable<void> {}
  copy?(
    source: Uri,
    destination: Uri,
    options: { overwrite: boolean }
  ): void | Thenable<void> {}
}
