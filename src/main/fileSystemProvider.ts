import {
  ProviderResult,
  Disposable,
  Event,
  FileChangeEvent,
  FileStat,
  FileSystemProvider,
  FileType,
  Uri,
  EventEmitter,
} from "vscode";
import * as path from "path";
import * as kubectl from "./ctl/kubectl";
import * as nhctl from "./ctl/nhctl";
import * as shell from "./ctl/shell";
import host from "./host";

import * as fileUtil from "./utils/fileUtil";

export default class NocalhostFileSystemProvider implements FileSystemProvider {
  static supportScheme = ["Nocalhost"];
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
          const shellObj = await shell.execAsync(
            `kubectl logs ${podName} -c ${constainerName}`,
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
        // Nocalhost://nh/config/svc/name
        // TODO:
        const paths = uri.path.split("/");
        const names = paths[1].split(".");
        const name = names[0];
        result = await nhctl.loadResource(host, name);
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
    const fspath = path.resolve(uri.fsPath);
    await fileUtil.writeFile(fspath, content);
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
