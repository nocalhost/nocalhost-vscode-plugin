import {
  Disposable,
  TextDocumentSaveReason,
  TextDocumentWillSaveEvent,
  workspace,
} from "vscode";

import { SyncMsg } from "../commands/SyncServiceCommand";
import { getSyncStatus } from "../ctl/nhctl";

type SyncReq = {
  resourceType: string;
  kubeConfigPath: string;
  namespace: string;
  appName: string;
  workloadName: string;
};

export class LiveReload {
  private disposable: Disposable[];
  private req: SyncReq;
  private syncComplete: Function;

  constructor(req: SyncReq, syncComplete: Function) {
    this.req = req;
    this.syncComplete = syncComplete;
    this.disposable = [
      workspace.onWillSaveTextDocument(this.onDidSaveTextDocument.bind(this)),
    ];
  }

  private onDidSaveTextDocument(event: TextDocumentWillSaveEvent) {
    if (event.reason === TextDocumentSaveReason.Manual) {
      console.warn("save", event.document.fileName, event.document.languageId);

      this.witSyncComplete();
    }
  }

  private syncTimeoutId: NodeJS.Timeout;

  private async witSyncComplete() {
    const result = await getSyncStatus(
      this.req.resourceType,
      this.req.kubeConfigPath,
      this.req.namespace,
      this.req.appName,
      this.req.workloadName
    );

    if (result) {
      let syncMsg = JSON.parse(result) as SyncMsg;

      if (syncMsg.status !== "idle") {
        this.syncTimeoutId = setTimeout(() => this.witSyncComplete(), 500);
      } else {
        this.syncTimeoutId = null;
        this.syncComplete();
      }
    }
  }

  dispose() {
    clearTimeout(this.syncTimeoutId);
    this.syncTimeoutId = null;

    this.disposable.forEach((item) => item.dispose());
    this.disposable.length = 0;
  }
}
