import {
  Disposable,
  Event,
  FileChangeEvent,
  FileStat,
  FileSystemProvider,
  FileType,
  Uri,
  EventEmitter,
  commands,
} from "vscode";
import * as yaml from "yaml";
import * as kubectl from "./ctl/kubectl";
import * as nhctl from "./ctl/nhctl";
import * as shell from "./ctl/shell";
import host from "./host";

import * as fileUtil from "./utils/fileUtil";
import ConfigService from "./service/configService";
import * as fileStore from "./store/fileStore";
import { CURRENT_KUBECONFIG_FULLPATH } from "./constants";

export default class NocalhostFileSystemProvider implements FileSystemProvider {
  static supportScheme = ["Nocalhost", "NocalhostRW"];
  static supportAuthority = ["k8s", "nh"];
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
  stat(uri: Uri): FileStat | Thenable<FileStat> {
    return {
      type: FileType.File,
      ctime: 0,
      mtime: 0,
      size: 65536,
    };
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
        const type = paths[1];
        if (type === "loadResource") {
          const kind = paths[2];
          const names = paths[3].split(".");
          const name = names[0];
          const output = names[1];
          result = (await kubectl.loadResource(host, kind, name, output)) || "";
        } else if (type === "log") {
          // Nocalhost://k8s/log/pod/container
          const podName = paths[2];
          const constainerName = paths[3];
          const kubeconfigPath = fileStore.get(CURRENT_KUBECONFIG_FULLPATH);
          const shellObj = await shell.execAsync(
            `kubectl logs ${podName} -c ${constainerName} --kubeconfig ${kubeconfigPath}`,
            []
          );
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
        if (type === "loadResource") {
          const name = paths[2];
          result = await nhctl.loadResource(host, name);
        } else if (type === "config") {
          const configType = paths[2];
          if (configType === "app") {
            const appName = paths[3];
            const key = paths[4]; // Array|Object|string
            const subKey = paths[5]; // subPropery

            const appInfo = await ConfigService.getAppConfig(appName);
            if (key && subKey) {
              if (appInfo[key] instanceof Array) {
                result = "";
                for (let i = 0; i < appInfo[key].length; i++) {
                  if (appInfo[key][i] && appInfo[key][i].name === subKey) {
                    result = this.stringify([appInfo[key][i]], style);
                  }
                }
              } else if (appInfo[key] instanceof Object) {
                const obj = {};
                obj[subKey] = appInfo[key][subKey];
                result = this.stringify(obj, style);
              }
            } else if (key) {
              const obj = {};
              obj[key] = appInfo[key];
              result = this.stringify(obj, style);
            }
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
    let destDir = "";
    let destData: string | Buffer;

    let command: string;
    let args;
    if (type === "config") {
      const configType = paths[2];
      if (configType === "app") {
        const appName = paths[3];
        const key = paths[4]; // Array|Object|string
        const subKey = paths[5]; // subPropery

        destDir = ConfigService.getAppConfigPath(appName);

        const appInfo = await ConfigService.getAppConfig(appName);
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
        }
        destData = Buffer.from(this.stringify(appInfo, "yaml"), "utf-8");
      }
    }

    if (destDir) {
      await fileUtil.writeFile(destDir, destData);
      if (command) {
        commands.executeCommand(command, args);
      }
    }
  }

  private stringify(obj, style: string) {
    if (style === "yaml") {
      return yaml.stringify(obj);
    } else if (style === "json") {
      return JSON.stringify(obj, null, 2);
    }
  }

  private parse(str, style: string) {
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
