import * as vscode from "vscode";
import messageDefaultHandler from "./messageDefaultHandler";

export type MessageListener = (event: IMessage) => void;
export interface IMessage {
  type: string;
  payload?: {
    [key: string]: any;
  };
}

export default class MessageManager {
  private panel: vscode.WebviewPanel;
  private listeners: MessageListener[] = [];

  constructor(panel: vscode.WebviewPanel) {
    this.panel = panel;
    this.listeners.push(messageDefaultHandler);
    this.panel?.webview.onDidReceiveMessage((event: IMessage) => {
      if (this.listeners.length > 0) {
        this.listeners.forEach((listener: MessageListener) => {
          listener.call(this, event);
        });
      }
    });
  }

  private index(listener: MessageListener): number {
    for (let i = 0, len = this.listeners.length; i < len; i++) {
      if (this.listeners[i] === listener) {
        return i;
      }
    }
    return -1;
  }

  addListener(listener: MessageListener): void {
    const index: number = this.index(listener);
    if (index !== -1) {
      return;
    }
    this.listeners.push(listener);
  }

  removeListener(listener: MessageListener): void {
    const index: number = this.index(listener);
    if (index !== -1) {
      return;
    }
    this.listeners.splice(index, 1);
  }

  postMessage(message: IMessage): void {
    if (this.panel) {
      this.panel?.webview.postMessage(message);
    }
  }
}
