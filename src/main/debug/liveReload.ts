import { spawn } from "child_process";
import {
  Disposable,
  TextDocumentChangeEvent,
  TextDocumentSaveReason,
  TextDocumentWillSaveEvent,
  workspace,
  debug,
} from "vscode";
import kill = require("tree-kill");

import { Sync, SyncMsg } from "../commands/SyncServiceCommand";
import { NhctlCommand } from "../ctl/nhctl";
import host from "../host";

export class LiveReload {
  private disposable: Disposable[];
  private req: Sync;
  private changeCallback: Function;
  private isChange: boolean = false;

  constructor(req: Sync, changeCallback: Function) {
    this.req = req;
    this.changeCallback = changeCallback;
    this.disposable = [
      workspace.onWillSaveTextDocument(this.onDidSaveTextDocument.bind(this)),
      workspace.onDidChangeTextDocument(
        this.onDidChangeTextDocument.bind(this)
      ),
    ];
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
      this.witSync();
    }
  }

  private async witSync() {
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

    host.withProgress({ title: "Waiting for sync file ..." }, async () => {
      return new Promise<void>(async (res, rej) => {
        const proc = spawn(nhctlCmd.getCommand(), [], {
          shell: true,
          env: Object.assign(process.env, { DISABLE_SPINNER: true }),
        });

        let stderr = "";
        let stdout = "";
        proc.stdout.on("data", async (data: Buffer) => {
          const str = data.toString();
          stdout += str;

          if (str) {
            let syncMsg = JSON.parse(str) as SyncMsg;

            if (syncMsg.status === "idle") {
              !proc.killed && kill(proc.pid);

              await this.changeCallback();

              res();
            }
          }
        });
        proc.stderr.on("data", function (data: Buffer) {
          const str = data.toString();
          stderr += str;

          host.log(str);
        });
        proc.on("close", async (code: Number) => {
          if (code !== 0) {
            rej({ code, stdout, stderr });
          }
        });
      });
    });
  }

  dispose() {
    this.disposable.forEach((item) => item.dispose());
    this.disposable.length = 0;
  }
}
