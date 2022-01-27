import { spawn } from "child_process";
import {
  Disposable,
  FileSystemWatcher,
  workspace,
  Uri,
  RelativePattern,
} from "vscode";

import { Sync, SyncMsg } from "../commands/sync/SyncServiceCommand";
import { NhctlCommand } from "../ctl/nhctl";
import { getExecCommand, ShellExecError } from "../ctl/shell";
import host from "../host";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";

export class LiveReload {
  private disposable: Disposable[] = [];
  private watcher: FileSystemWatcher;
  private req: Sync;

  private isChange: boolean = false;

  constructor(node: ControllerResourceNode, callback: () => Promise<void>) {
    this.req = {
      namespace: node.getNameSpace(),
      kubeConfigPath: node.getKubeConfigPath(),
      resourceType: node.resourceType,
      app: node.getAppName(),
      service: node.name,
    };

    this.watcher = workspace.createFileSystemWatcher(
      new RelativePattern(host.getCurrentRootPath(), "**/*.*")
    );
    this.watcher.onDidChange(this.waitSyncFile.bind(this));
    this.watcher.onDidCreate(this.waitSyncFile.bind(this));
    this.watcher.onDidDelete(this.waitSyncFile.bind(this));

    this.disposable.push(this.watcher);

    this.startWatch(callback);
  }

  private waitSyncFile(uri: Uri) {
    if (uri.path.includes(".vscode") || this.isChange) {
      return;
    }

    this.isChange = true;
  }

  private startWatch(callback: () => Promise<void>) {
    const nhctlCmd = new NhctlCommand("sync-status", {
      kubeConfigPath: this.req.kubeConfigPath,
      namespace: this.req.namespace,
    });
    nhctlCmd.args = [
      this.req.app,
      `-d ${this.req.service}`,
      `-t ${this.req.resourceType}`,
      "--watch",
    ];

    const command = getExecCommand(nhctlCmd.getCommand());

    const proc = spawn(command, [], {
      shell: true,
    });

    let stderr = "";
    let stdout = "";
    proc.stdout.on("data", async (data: Buffer) => {
      const str = data.toString();
      stdout += str;

      if (str) {
        let syncMsg = JSON.parse(str) as SyncMsg;

        if (syncMsg.status === "idle" && this.isChange) {
          this.isChange = false;

          await callback();
        }
      }
    });
    proc.stderr.on("data", function (data: Buffer) {
      const str = data.toString();
      stderr += str;

      host.log(str);
    });
    proc.on("close", (code: number, signal: NodeJS.Signals) => {
      if (code !== null && code !== 0) {
        throw new ShellExecError({ stderr, stdout, code, command });
      }
    });

    const dispose = () => {
      if (!proc.killed) {
        proc.kill();
      }
    };

    this.disposable.push({ dispose });
  }

  dispose() {
    this.disposable.forEach((item) => item.dispose());
    this.disposable.length = 0;
  }
}
