import * as vscode from "vscode";

export type CloseTextDocumentListener = (doc: vscode.TextDocument) => void;

let instance: EventCenter | null = null;

export default class EventCenter {
  public static getInstance(): EventCenter {
    if (!instance) {
      instance = new EventCenter();
    }
    return instance;
  }
  private closeTextDocumentListeners: CloseTextDocumentListener[] = [];

  constructor() {
    vscode.workspace.onDidCloseTextDocument((doc: vscode.TextDocument) => {
      this.closeTextDocumentListeners.forEach(
        (listener: CloseTextDocumentListener) => {
          listener.call(null, doc);
        }
      );
    });
  }

  addCloseTextDocumentListener(listener: CloseTextDocumentListener): void {
    const index: number = this.closeTextDocumentListeners.indexOf(listener);
    if (index === -1) {
      this.closeTextDocumentListeners.push(listener);
    }
  }
  removeCloseTextDocumentListener(listener: CloseTextDocumentListener): void {
    const index: number = this.closeTextDocumentListeners.indexOf(listener);
    if (index !== -1) {
      this.closeTextDocumentListeners.splice(index, 1);
    }
  }
}
