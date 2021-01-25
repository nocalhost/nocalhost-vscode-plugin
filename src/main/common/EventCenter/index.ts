import * as vscode from "vscode";

export type SaveTextDocumentListener = (
  doc: vscode.TextDocument
) => void | Promise<void>;

let instance: EventCenter | null = null;

export default class EventCenter {
  public static getInstance(): EventCenter {
    if (!instance) {
      instance = new EventCenter();
    }
    return instance;
  }
  private saveTextDocumentListeners: SaveTextDocumentListener[] = [];

  constructor() {
    vscode.workspace.onDidSaveTextDocument((doc: vscode.TextDocument) => {
      this.saveTextDocumentListeners.forEach(
        (listener: SaveTextDocumentListener) => {
          listener.call(null, doc);
        }
      );
    });
  }

  addSaveTextDocumentListener(listener: SaveTextDocumentListener): void {
    const index: number = this.saveTextDocumentListeners.indexOf(listener);
    if (index === -1) {
      this.saveTextDocumentListeners.push(listener);
    }
  }
  removeSaveTextDocumentListener(listener: SaveTextDocumentListener): void {
    const index: number = this.saveTextDocumentListeners.indexOf(listener);
    if (index !== -1) {
      this.saveTextDocumentListeners.splice(index, 1);
    }
  }
}
