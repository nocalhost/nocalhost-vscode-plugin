import { spawn } from "child_process";
import {
  Disposable,
  TextDocumentChangeEvent,
  TextDocumentSaveReason,
  TextDocumentWillSaveEvent,
  workspace,
} from "vscode";

import { Sync, SyncMsg } from "../commands/SyncServiceCommand";
import { NhctlCommand } from "../ctl/nhctl";
import { ShellExecError } from "../ctl/shell";
import host from "../host";
import { ControllerResourceNode } from "../nodes/workloads/controllerResources/ControllerResourceNode";

export class LiveReload {
  private isChange: boolean = false;
  private isSave: boolean = false;
  private disposable: Disposable[];
  private req: Sync;

  private reject: Function | null;
  private resolve: Function | null;

  constructor(node: ControllerResourceNode, callback: () => Promise<void>) {
    this.req = {
      namespace: node.getNameSpace(),
      kubeConfigPath: node.getKubeConfigPath(),
      resourceType: node.resourceType,
      app: node.getAppName(),
      service: node.name,
    };

    this.disposable = [
      workspace.onWillSaveTextDocument(this.onDidSaveTextDocument.bind(this)),
      workspace.onDidChangeTextDocument(
        this.onDidChangeTextDocument.bind(this)
      ),
    ];

    this.startwatch(callback);
  }
  private onDidChangeTextDocument(event: TextDocumentChangeEvent) {
    this.isChange = true;
  }
  private onDidSaveTextDocument(event: TextDocumentWillSaveEvent) {
    if (event.reason === TextDocumentSaveReason.Manual) {
      if (!this.isChange) {
        return;
      }
      this.isChange = false;
      this.isSave = true;

      this.watiSyncFile();
    }
  }

  private async watiSyncFile() {
    await host.withProgress(
      { title: "Waiting for sync file ...", cancellable: true },
      async (_, token) => {
        return new Promise((resolve, reject) => {
          this.reject = reject;
          this.resolve = resolve;

          token.onCancellationRequested(() => {
            this.reject(new Error("Cancel restart"));
          });
        }).finally(() => {
          this.reject = null;
          this.resolve = null;

          this.isSave = false;
        });
      }
    );
  }

  private startwatch(callback: () => Promise<void>) {
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

    const command = nhctlCmd.getCommand();

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

        if (syncMsg.status === "idle" && this.isSave) {
          await callback();

          this.resolve();
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
        this.reject &&
          this.reject(new ShellExecError({ stderr, stdout, code, command }));
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
